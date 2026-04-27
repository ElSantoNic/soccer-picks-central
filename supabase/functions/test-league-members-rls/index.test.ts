// Deno test wrapper for the league_members RLS regression checks.
//
// Loads .env from the project root so SUPABASE_URL / SUPABASE_ANON_KEY are
// available. SUPABASE_SERVICE_ROLE_KEY must be exported in the environment
// (it is intentionally NOT in the project .env). When this test runs via the
// Supabase test_edge_functions tool, all three are auto-injected.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runChecks } from "./runner.ts";

Deno.test("league_members RLS: scoring fields blocked, allowed fields editable", async () => {
  const result = await runChecks();

  if (!result.ok) {
    const failed = result.checks
      .filter((c) => !c.passed)
      .map((c) => `  - ${c.name}: ${c.detail}`)
      .join("\n");
    console.error(`Failing checks:\n${failed}`);
  }

  assert(result.ok, "One or more RLS regression checks failed");
  assert(result.checks.length === 4, "Expected 4 checks");
});
