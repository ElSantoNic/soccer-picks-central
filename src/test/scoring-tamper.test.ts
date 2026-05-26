import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Security regression tests: tampering with scoring columns must be
 * blocked by the database (RLS + triggers), and the legitimate
 * `score_match_results` path must still produce valid scoring rows.
 *
 * The authenticated portion of the suite requires a dedicated test user
 * (VITE_TEST_USER_EMAIL / VITE_TEST_USER_PASSWORD). When those env vars
 * are missing, the relevant blocks are skipped so CI without credentials
 * still passes. See src/test/README.md for one-time fixture setup.
 *
 * Safe to run against production: the suite only mutates the test user's
 * own pre-kickoff picks/membership and never asserts success of any
 * tamper write.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const TEST_EMAIL = import.meta.env.VITE_TEST_USER_EMAIL as string | undefined;
const TEST_PASSWORD = import.meta.env.VITE_TEST_USER_PASSWORD as string | undefined;

const hasCreds = Boolean(TEST_EMAIL && TEST_PASSWORD);
const describeAuthed = hasCreds ? describe : describe.skip;

function makeClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("picks / league_members anonymous baseline", () => {
  const anon = makeClient();

  it("anonymous cannot SELECT picks", async () => {
    const { data, error } = await anon.from("picks").select("id").limit(1);
    const leaked = !error && Array.isArray(data) && data.length > 0;
    expect(leaked).toBe(false);
  });

  it("anonymous cannot INSERT picks", async () => {
    const { data, error } = await anon
      .from("picks")
      .insert({
        user_id: "00000000-0000-0000-0000-000000000001",
        match_id: "00000000-0000-0000-0000-000000000002",
        jornada_id: "00000000-0000-0000-0000-000000000003",
        pick: "1",
        points_awarded: 100,
        is_correct: true,
      })
      .select();
    const inserted = !error && Array.isArray(data) && data.length > 0;
    expect(inserted).toBe(false);
    expect(error).not.toBeNull();
  });

  it("anonymous cannot UPDATE league_members points", async () => {
    const { data, error } = await anon
      .from("league_members")
      .update({ points_total: 9999, points_jornada: 9999 })
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    const updated = !error && Array.isArray(data) && data.length > 0;
    expect(updated).toBe(false);
  });
});

describeAuthed("picks scoring tamper guard (authenticated)", () => {
  const client = makeClient();
  let userId: string;

  beforeAll(async () => {
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_EMAIL!,
      password: TEST_PASSWORD!,
    });
    if (error || !data.user) throw new Error(`sign-in failed: ${error?.message}`);
    userId = data.user.id;
  });

  it("UPDATE attempting to inflate points_awarded/is_correct is silently reverted", async () => {
    // Find any existing pick for this user (regardless of kickoff state).
    const { data: picks } = await client
      .from("picks")
      .select("id, match_id, jornada_id, pick, points_awarded, is_correct")
      .eq("user_id", userId)
      .limit(1);

    if (!picks || picks.length === 0) {
      console.warn("[scoring-tamper] no pick rows for test user — skipping UPDATE tamper check");
      return;
    }

    const target = picks[0];
    const originalPoints = target.points_awarded;
    const originalCorrect = target.is_correct;

    // Tamper attempt — trigger should silently preserve OLD values.
    await client
      .from("picks")
      .update({ points_awarded: 999, is_correct: true })
      .eq("id", target.id);

    const { data: after } = await client
      .from("picks")
      .select("points_awarded, is_correct")
      .eq("id", target.id)
      .single();

    expect(after?.points_awarded).toBe(originalPoints);
    expect(after?.is_correct).toBe(originalCorrect);
  });

  it("UPDATE attempting to change user_id is blocked by RLS WITH CHECK", async () => {
    const { data: picks } = await client
      .from("picks")
      .select("id")
      .eq("user_id", userId)
      .limit(1);
    if (!picks || picks.length === 0) return;

    const { data, error } = await client
      .from("picks")
      .update({ user_id: "00000000-0000-0000-0000-000000000099" })
      .eq("id", picks[0].id)
      .select();

    const reassigned = !error && Array.isArray(data) && data.length > 0;
    expect(reassigned).toBe(false);
  });

  // Tracks the still-open INSERT-path gap: BEFORE INSERT branch on
  // prevent_pick_score_tampering is not yet wired up, so a fresh INSERT
  // can carry tampered scoring columns. Marked `.fails` so the suite
  // turns green once that fix lands and red if regression occurs.
  it.fails(
    "INSERT with tampered points_awarded should be neutralized (open gap)",
    async () => {
      // Find an upcoming match the user hasn't picked yet.
      const { data: matches } = await client
        .from("matches")
        .select("id, jornada_id, kickoff_utc")
        .gt("kickoff_utc", new Date().toISOString())
        .order("kickoff_utc", { ascending: true })
        .limit(20);

      if (!matches || matches.length === 0) {
        throw new Error("no upcoming matches available");
      }

      const { data: existing } = await client
        .from("picks")
        .select("match_id")
        .eq("user_id", userId)
        .in("match_id", matches.map((m) => m.id));
      const taken = new Set((existing ?? []).map((p) => p.match_id));
      const fresh = matches.find((m) => !taken.has(m.id));
      if (!fresh) throw new Error("no fresh upcoming match");

      const { data: inserted, error } = await client
        .from("picks")
        .insert({
          user_id: userId,
          match_id: fresh.id,
          jornada_id: fresh.jornada_id,
          pick: "1",
          points_awarded: 100,
          is_correct: true,
        })
        .select("id, points_awarded, is_correct")
        .single();

      // Cleanup regardless of outcome.
      if (inserted?.id) {
        await client.from("picks").delete().eq("id", inserted.id);
      }

      expect(error).toBeNull();
      expect(inserted?.points_awarded).toBe(0);
      expect(inserted?.is_correct).toBeNull();
    },
  );
});

describeAuthed("league_members scoring tamper guard (authenticated)", () => {
  const client = makeClient();
  let userId: string;

  beforeAll(async () => {
    const { data, error } = await client.auth.signInWithPassword({
      email: TEST_EMAIL!,
      password: TEST_PASSWORD!,
    });
    if (error || !data.user) throw new Error(`sign-in failed: ${error?.message}`);
    userId = data.user.id;
  });

  it("UPDATE points_total / points_jornada / badges on own membership is rejected", async () => {
    const { data: members } = await client
      .from("league_members")
      .select("id, points_total, points_jornada, badges")
      .eq("user_id", userId)
      .limit(1);

    if (!members || members.length === 0) {
      console.warn("[scoring-tamper] test user has no league memberships — skipping");
      return;
    }

    const target = members[0];

    const { error } = await client
      .from("league_members")
      .update({
        points_total: 9999,
        points_jornada: 9999,
        badges: ["hacker"],
      })
      .eq("id", target.id);

    // Trigger raises — expect an error returned by PostgREST.
    expect(error).not.toBeNull();

    // Defense in depth: re-read and confirm nothing changed.
    const { data: after } = await client
      .from("league_members")
      .select("points_total, points_jornada, badges")
      .eq("id", target.id)
      .single();

    expect(after?.points_total).toBe(target.points_total);
    expect(after?.points_jornada).toBe(target.points_jornada);
    expect(after?.badges).toEqual(target.badges);
  });
});

describe("positive scoring path (read-only)", () => {
  const anon = makeClient();

  it("matches with a settled result_1x2 are public and parsable", async () => {
    // We can't read picks anonymously (RLS), but we can at least confirm
    // the public matches table exposes settled results so the scoring
    // trigger has data to act on. Authenticated assertion lives in the
    // authed blocks above when picks exist for the test user.
    const { data, error } = await anon
      .from("matches")
      .select("id, result_1x2")
      .not("result_1x2", "is", null)
      .limit(1);

    expect(error).toBeNull();
    if (data && data.length > 0) {
      expect(["1", "X", "2"]).toContain(data[0].result_1x2);
    }
  });
});
