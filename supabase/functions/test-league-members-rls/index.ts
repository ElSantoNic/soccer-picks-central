// Security regression self-test for league_members privilege escalation.
//
// This edge function provisions a temporary auth user + league + membership,
// then verifies (as that user, using their JWT) that:
//   1. UPDATE points_jornada is BLOCKED by the tampering trigger
//   2. UPDATE points_total is BLOCKED
//   3. UPDATE badges       is BLOCKED
//   4. UPDATE avatar_emoji (allowed field) SUCCEEDS
// Returns JSON with per-check results. Tears down all fixtures at the end.
//
// Auth: verify_jwt = false (configured in supabase/config.toml). The function
// uses SUPABASE_SERVICE_ROLE_KEY internally to provision/teardown.
// Intended to be invoked from CI / test_edge_functions tool. Safe to leave
// deployed because it only creates and immediately deletes ephemeral data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.45.0/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

async function runChecks(): Promise<{ ok: boolean; checks: CheckResult[] }> {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const checks: CheckResult[] = [];
  let userId: string | null = null;
  let leagueId: string | null = null;
  let memberId: string | null = null;

  try {
    // ----- Provision -----
    const email = `rls-test+${crypto.randomUUID()}@example.com`;
    const password = crypto.randomUUID() + "Aa1!";

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (cErr || !created.user) throw new Error(`createUser: ${cErr?.message}`);
    userId = created.user.id;

    const tmpClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signIn, error: sErr } = await tmpClient.auth.signInWithPassword({
      email,
      password,
    });
    if (sErr || !signIn.session) throw new Error(`signIn: ${sErr?.message}`);
    const accessToken = signIn.session.access_token;

    const joinCode = Math.floor(1000 + Math.random() * 9000).toString();
    const { data: league, error: lErr } = await admin
      .from("leagues")
      .insert({ name: `RLS Test ${joinCode}`, join_code: joinCode, created_by: userId })
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

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
      const blocked = !!error && Array.isArray(row?.badges) && row!.badges.length === 0;
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
    if (memberId) await admin.from("league_members").delete().eq("id", memberId);
    if (leagueId) await admin.from("leagues").delete().eq("id", leagueId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }

  return { ok: checks.every((c) => c.passed), checks };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const result = await runChecks();
    return new Response(JSON.stringify(result, null, 2), {
      status: result.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
