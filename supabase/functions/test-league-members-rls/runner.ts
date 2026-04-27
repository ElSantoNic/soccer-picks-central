// Self-contained runner for the league_members RLS regression checks.
//
// Exposes runChecks() so it can be invoked from:
//   1. The HTTP edge function (index.ts) — env vars auto-injected by Supabase.
//   2. A local Deno test (index.test.ts) — env vars loaded from .env.
//
// Required env vars (validated up-front with a clear error so callers never
// see the cryptic "fetch failed" / "Invalid API key" downstream failure):
//   - SUPABASE_URL
//   - SUPABASE_ANON_KEY
//   - SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

export interface RunResult {
  ok: boolean;
  checks: CheckResult[];
}

const REQUIRED_ENV = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

/**
 * Resolve required env vars. Falls back to VITE_-prefixed equivalents for the
 * URL/anon key (those are the names used in the project's .env). Service role
 * has no VITE_ fallback by design (must never be in frontend env).
 */
export function resolveEnv(): {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
} {
  const url =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL") ?? "";
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??
    "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL");
  if (!anonKey) missing.push("SUPABASE_ANON_KEY");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required env var(s): ${missing.join(", ")}. ` +
        `When running locally, ensure .env is loaded and SUPABASE_SERVICE_ROLE_KEY ` +
        `is exported (it is intentionally NOT in the project .env). ` +
        `When running as a deployed edge function these are auto-injected.`,
    );
  }

  return { url, anonKey, serviceRoleKey };
}

export async function runChecks(): Promise<RunResult> {
  const { url, anonKey, serviceRoleKey } = resolveEnv();

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const checks: CheckResult[] = [];
  let userId: string | null = null;
  let leagueId: string | null = null;
  let memberId: string | null = null;

  try {
    // ----- Provision ephemeral user + league + member -----
    const email = `rls-test+${crypto.randomUUID()}@example.com`;
    const password = crypto.randomUUID() + "Aa1!";

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (cErr || !created.user) throw new Error(`createUser: ${cErr?.message}`);
    userId = created.user.id;

    const tmpClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: sErr } =
      await tmpClient.auth.signInWithPassword({ email, password });
    if (sErr || !signIn.session) throw new Error(`signIn: ${sErr?.message}`);
    const accessToken = signIn.session.access_token;

    const joinCode = Math.floor(1000 + Math.random() * 9000).toString();
    const { data: league, error: lErr } = await admin
      .from("leagues")
      .insert({
        name: `RLS Test ${joinCode}`,
        join_code: joinCode,
        created_by: userId,
      })
      .select()
      .single();
    if (lErr || !league) throw new Error(`league: ${lErr?.message}`);
    leagueId = league.id;

    const { data: member, error: mErr } = await admin
      .from("league_members")
      .insert({
        league_id: leagueId,
        user_id: userId,
        display_name: "RLS Tester",
        points_jornada: 0,
        points_total: 0,
        badges: [],
        avatar_emoji: "⚽",
      })
      .select()
      .single();
    if (mErr || !member) throw new Error(`member: ${mErr?.message}`);
    memberId = member.id;

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    // ----- Check 1: points_jornada blocked -----
    {
      const { error } = await userClient
        .from("league_members")
        .update({ points_jornada: 9999 })
        .eq("id", memberId);
      const { data: row } = await admin
        .from("league_members")
        .select("points_jornada")
        .eq("id", memberId)
        .single();
      const blocked = !!error && row?.points_jornada === 0;
      checks.push({
        name: "points_jornada update blocked",
        passed: blocked,
        detail: error
          ? `error="${error.message}", points_jornada=${row?.points_jornada}`
          : `NO ERROR — points_jornada=${row?.points_jornada} (security failure)`,
      });
    }

    // ----- Check 2: points_total blocked -----
    {
      const { error } = await userClient
        .from("league_members")
        .update({ points_total: 9999 })
        .eq("id", memberId);
      const { data: row } = await admin
        .from("league_members")
        .select("points_total")
        .eq("id", memberId)
        .single();
      const blocked = !!error && row?.points_total === 0;
      checks.push({
        name: "points_total update blocked",
        passed: blocked,
        detail: error
          ? `error="${error.message}", points_total=${row?.points_total}`
          : `NO ERROR — points_total=${row?.points_total} (security failure)`,
      });
    }

    // ----- Check 3: badges blocked -----
    {
      const { error } = await userClient
        .from("league_members")
        .update({ badges: ["champion"] })
        .eq("id", memberId);
      const { data: row } = await admin
        .from("league_members")
        .select("badges")
        .eq("id", memberId)
        .single();
      const blocked =
        !!error && Array.isArray(row?.badges) && row!.badges.length === 0;
      checks.push({
        name: "badges update blocked",
        passed: blocked,
        detail: error
          ? `error="${error.message}", badges=${JSON.stringify(row?.badges)}`
          : `NO ERROR — badges=${JSON.stringify(row?.badges)} (security failure)`,
      });
    }

    // ----- Check 4: avatar_emoji allowed -----
    {
      const { error } = await userClient
        .from("league_members")
        .update({ avatar_emoji: "🦊" })
        .eq("id", memberId);
      const { data: row } = await admin
        .from("league_members")
        .select("avatar_emoji")
        .eq("id", memberId)
        .single();
      const ok = !error && row?.avatar_emoji === "🦊";
      checks.push({
        name: "avatar_emoji update allowed",
        passed: ok,
        detail: error
          ? `unexpected error="${error.message}"`
          : `avatar_emoji=${row?.avatar_emoji}`,
      });
    }
  } finally {
    if (memberId)
      await admin.from("league_members").delete().eq("id", memberId);
    if (leagueId) await admin.from("leagues").delete().eq("id", leagueId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }

  return { ok: checks.every((c) => c.passed), checks };
}
