// Deno test wrapper for the league_members RLS regression checks.
//
// Strategy: prefer running the checks in-process (so we exercise runner.ts
// directly), but if SUPABASE_SERVICE_ROLE_KEY is not available locally, fall
// back to invoking the already-deployed edge function over HTTP. Either path
// asserts the same contract: 4 checks, all passing.
//
// Local env: loaded from .env via dotenv (provides VITE_SUPABASE_URL +
// VITE_SUPABASE_PUBLISHABLE_KEY). The service-role key is intentionally NOT
// in .env. When running via the Supabase test_edge_functions tool, all three
// secrets are auto-injected and the in-process path is used.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runChecks, type RunResult } from "./runner.ts";

async function runViaHttp(): Promise<RunResult> {
  const url =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !anonKey) {
    throw new Error(
      "Cannot run via HTTP fallback: SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_ equivalents) missing from env / .env",
    );
  }
  const res = await fetch(`${url}/functions/v1/test-league-members-rls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
  });
  const body = await res.json();
  return body as RunResult;
}

Deno.test(
  "league_members RLS: scoring fields blocked, allowed fields editable",
  async () => {
    const hasServiceRole = !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const result: RunResult = hasServiceRole
      ? await runChecks()
      : await runViaHttp();

    if (!result.ok) {
      const failed = (result.checks ?? [])
        .filter((c) => !c.passed)
        .map((c) => `  - ${c.name}: ${c.detail}`)
        .join("\n");
      console.error(
        `Failing checks (mode=${hasServiceRole ? "in-process" : "http"}):\n${failed}`,
      );
    }

    assert(result.ok, "One or more RLS regression checks failed");
    assertEquals(result.checks.length, 4, "Expected 4 checks");
  },
);
