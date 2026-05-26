## Goal
Add automated regression tests that attempt the known tampering payloads against `picks` and `league_members` and assert the database (RLS + triggers) blocks them, while confirming the legitimate `score_match_results` path still writes scoring fields.

## Test stack
Reuse the existing Vitest + `@supabase/supabase-js` setup already used by `src/test/profiles-rls.test.ts`. New file: `src/test/scoring-tamper.test.ts`. Runs against the live project (`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`) using the anon key only — no service-role key in tests.

## Fixtures
Because RLS requires a real authenticated user, the test uses Supabase email+password sign-in against a dedicated test account. Two new repo secrets, read via `import.meta.env`:
- `VITE_TEST_USER_EMAIL`
- `VITE_TEST_USER_PASSWORD`

If either is missing, the suite calls `it.skip` with a clear message so CI without credentials still passes. We document the one-time setup (create the user in Supabase Auth, add the user to one seed league, ensure at least one pick row exists for them) in a short `src/test/README.md`.

## Test cases

### `picks` tamper guard (authenticated user, own row)
1. INSERT a new pick with `points_awarded: 100, is_correct: true` for an upcoming match → row is created but `points_awarded === 0` and `is_correct === null` (BEFORE INSERT branch of `prevent_pick_score_tampering`, once the trigger is extended; for current trigger, expect the INSERT to succeed with tampered values and mark the test `.fails` to track the open gap).
2. UPDATE an existing own pick setting `points_awarded: 999, is_correct: true` → request returns no error, but a re-`select` shows scoring columns unchanged.
3. UPDATE attempting to change `user_id` to another UUID → blocked by RLS WITH CHECK; expect error or zero rows affected.

### `picks` RLS guard (cross-user)
4. UPDATE on a pick belonging to a different `user_id` → zero rows updated, scoring columns on that row unchanged when re-read via admin RPC or skipped if no second user is available.

### `league_members` tamper guard
5. UPDATE own membership row setting `points_total: 9999, points_jornada: 9999, badges: ['hacker']` → `prevent_league_member_points_tampering` raises; assert error returned and values unchanged on re-select.
6. UPDATE attempting to change `display_name` of own row → allowed (sanity check that legitimate edits still work) and propagates through `sync_league_member_display_name` only via profile updates — here we only assert the direct membership `display_name` change is rejected by the tamper trigger, matching current behavior.

### Anonymous baseline
7. Anon client cannot SELECT/UPDATE/INSERT into `picks` or `league_members` (mirrors existing `profiles-rls.test.ts` shape).

### Positive path (system write still works)
8. Read-only assertion: pick a historical match where `result_1x2` is set and verify that picks tied to it have `points_awarded` in {0, 3} and `is_correct` non-null. This proves the scoring trigger has been writing successfully despite the tamper guard. No write performed by the test.

## Running
- `bunx vitest run src/test/scoring-tamper.test.ts`
- Add a short note to `README.md` test section: required env vars and that the suite is safe to run against production (only mutates the dedicated test user's own pre-kickoff picks; never asserts success of a tamper write).

## Files
- New: `src/test/scoring-tamper.test.ts`
- New: `src/test/README.md` (one-time fixture setup instructions)
- No app code, no migrations, no schema changes.

## Out of scope
- Wiring the suite into CI — left as a follow-up once the test user is provisioned.
- Fixing the still-open INSERT-path gap on `picks` (case 1 above) — tracked separately; this plan only adds the test that surfaces it.
