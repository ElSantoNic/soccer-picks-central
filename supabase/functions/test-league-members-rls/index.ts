// HTTP entrypoint for the league_members RLS regression suite.
// Real logic lives in runner.ts so it can also be invoked from a Deno test.
//
// SECURITY: This function uses the service role key to create real auth users
// and DB rows. It is gated behind a shared secret (TEST_RUNNER_SECRET) so it
// cannot be invoked by anonymous callers in production.

import { runChecks } from "./runner.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-test-runner-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const expected = Deno.env.get("TEST_RUNNER_SECRET");
  if (!expected) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          "TEST_RUNNER_SECRET is not configured. This function is disabled until the secret is set.",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const provided =
    req.headers.get("x-test-runner-secret") ??
    req.headers.get("X-Test-Runner-Secret");
  if (provided !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
