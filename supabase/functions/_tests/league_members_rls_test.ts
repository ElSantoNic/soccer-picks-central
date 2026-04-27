// Regression test for league_members privilege-escalation protection.
//
// Verifies that:
//   1. An authenticated user CANNOT update points_jornada, points_total, or
//      badges on their own league_members row (blocked by the
//      prevent_league_member_points_tampering trigger).
//   2. An authenticated user CAN still update allowed fields (avatar_emoji)
//      on their own row.
//
// Auth strategy: use SUPABASE_SERVICE_ROLE_KEY to provision a temporary
// auth user + league + membership row, then perform the asserted operations
// using the user's own JWT (anon key + Authorization header). Tear everything
// down at the end.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

assert(SUPABASE_URL, "SUPABASE_URL missing");
assert(SUPABASE_ANON_KEY, "SUPABASE_ANON_KEY missing");
assert(SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY missing");

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface Fixture {
  userId: string;
  accessToken: string;
  leagueId: string;
  memberId: string;
}

async function setupFixture(): Promise<Fixture> {
  const email = `rls-test+${crypto.randomUUID()}@example.com`;
  const password = crypto.randomUUID() + "Aa1!";

  // 1. Create confirmed auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) throw createErr ?? new Error("user create failed");
  const userId = created.user.id;

  // 2. Sign in to obtain a real JWT for that user
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signErr } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signErr || !signIn.session) throw signErr ?? new Error("sign-in failed");
  const accessToken = signIn.session.access_token;

  // 3. Create league + membership using admin (bypasses RLS)
  const joinCode = Math.floor(1000 + Math.random() * 9000).toString();
  const { data: league, error: leagueErr } = await admin
    .from("leagues")
    .insert({ name: `RLS Test ${joinCode}`, join_code: joinCode, created_by: userId })
    .select()
    .single();
  if (leagueErr || !league) throw leagueErr ?? new Error("league create failed");

  const { data: member, error: memberErr } = await admin
    .from("league_members")
    .insert({
      league_id: league.id,
      user_id: userId,
      display_name: "RLS Tester",
      points_jornada: 0,
      points_total: 0,
      badges: [],
      avatar_emoji: "⚽",
    })
    .select()
    .single();
  if (memberErr || !member) throw memberErr ?? new Error("member create failed");

  return { userId, accessToken, leagueId: league.id, memberId: member.id };
}

async function teardown(f: Fixture) {
  await admin.from("league_members").delete().eq("league_id", f.leagueId);
  await admin.from("leagues").delete().eq("id", f.leagueId);
  await admin.auth.admin.deleteUser(f.userId);
}

function userScopedClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

Deno.test("authenticated user CANNOT self-award points_jornada", async () => {
  const f = await setupFixture();
  try {
    const client = userScopedClient(f.accessToken);
    const { error } = await client
      .from("league_members")
      .update({ points_jornada: 9999 })
      .eq("id", f.memberId);

    assert(error, "Expected error when updating points_jornada");
    assert(
      /not allowed/i.test(error!.message),
      `Expected tampering error, got: ${error!.message}`,
    );

    // Confirm the row was not actually updated
    const { data: row } = await admin
      .from("league_members")
      .select("points_jornada")
      .eq("id", f.memberId)
      .single();
    assertEquals(row?.points_jornada, 0);
  } finally {
    await teardown(f);
  }
});

Deno.test("authenticated user CANNOT self-award points_total", async () => {
  const f = await setupFixture();
  try {
    const client = userScopedClient(f.accessToken);
    const { error } = await client
      .from("league_members")
      .update({ points_total: 9999 })
      .eq("id", f.memberId);

    assert(error, "Expected error when updating points_total");
    const { data: row } = await admin
      .from("league_members")
      .select("points_total")
      .eq("id", f.memberId)
      .single();
    assertEquals(row?.points_total, 0);
  } finally {
    await teardown(f);
  }
});

Deno.test("authenticated user CANNOT grant themselves badges", async () => {
  const f = await setupFixture();
  try {
    const client = userScopedClient(f.accessToken);
    const { error } = await client
      .from("league_members")
      .update({ badges: ["champion"] })
      .eq("id", f.memberId);

    assert(error, "Expected error when updating badges");
    const { data: row } = await admin
      .from("league_members")
      .select("badges")
      .eq("id", f.memberId)
      .single();
    assertEquals(row?.badges, []);
  } finally {
    await teardown(f);
  }
});

Deno.test("authenticated user CAN update allowed field (avatar_emoji)", async () => {
  const f = await setupFixture();
  try {
    const client = userScopedClient(f.accessToken);
    const { error } = await client
      .from("league_members")
      .update({ avatar_emoji: "🦊" })
      .eq("id", f.memberId);

    assertEquals(error, null);

    const { data: row } = await admin
      .from("league_members")
      .select("avatar_emoji")
      .eq("id", f.memberId)
      .single();
    assertEquals(row?.avatar_emoji, "🦊");
  } finally {
    await teardown(f);
  }
});
