import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Security regression test:
 * Unauthenticated (anon) users must NOT be able to INSERT or UPDATE
 * the `profiles` table. RLS INSERT/UPDATE policies are scoped to the
 * `authenticated` role with auth.uid() = user_id.
 *
 * Both attempts must be rejected by RLS (no row written, error returned).
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

describe("profiles RLS (anonymous)", () => {
  let anon: ReturnType<typeof createClient>;

  beforeAll(() => {
    anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  it("anonymous INSERT into profiles is blocked by RLS", async () => {
    const fakeUserId = "00000000-0000-0000-0000-000000000001";
    const { data, error } = await anon
      .from("profiles")
      .insert({
        user_id: fakeUserId,
        display_name: "rls-test",
        phone: "+10000000000",
      })
      .select();

    // Either an error is returned, or RLS silently filters and returns no rows.
    // A successful insert (data with rows, no error) would be a security failure.
    const insertedSomething = !error && Array.isArray(data) && data.length > 0;
    expect(insertedSomething).toBe(false);
    expect(error).not.toBeNull();
  });

  it("anonymous UPDATE on profiles is blocked by RLS", async () => {
    const { data, error } = await anon
      .from("profiles")
      .update({ phone: "+19999999999", display_name: "hacked" })
      .neq("user_id", "00000000-0000-0000-0000-000000000000")
      .select();

    const updatedSomething = !error && Array.isArray(data) && data.length > 0;
    expect(updatedSomething).toBe(false);
    // RLS may return either an error or an empty result set for anon updates;
    // both are acceptable as long as no row was modified.
    if (!error) {
      expect(data).toEqual([]);
    }
  });
});
