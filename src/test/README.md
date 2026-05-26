# Test fixtures

## Scoring tamper regression suite

`scoring-tamper.test.ts` exercises the database tamper guards on `picks` and
`league_members`. The authenticated portions of the suite need a dedicated
Supabase Auth user. Without credentials, those blocks are skipped (the anon
baseline still runs).

### One-time setup

1. Create a real auth user in the Supabase dashboard (Auth → Users → Add user)
   with an email + password you don't mind storing as a test secret.
2. Sign in as that user once in the app and join (or create) at least one
   league so a `league_members` row exists.
3. Submit at least one pick for any jornada so a `picks` row exists.
4. Add two env vars to `.env.local` (or your CI secret store):
   - `VITE_TEST_USER_EMAIL`
   - `VITE_TEST_USER_PASSWORD`

### Running

```
bunx vitest run src/test/scoring-tamper.test.ts
```

The suite is safe to run against production:

- It only writes to the test user's own rows.
- It never asserts that a tamper write succeeded — only that the database
  blocked or silently reverted it.
- The one `INSERT` test cleans up the row it creates (and is currently marked
  `.fails` to track the open INSERT-path gap in `prevent_pick_score_tampering`).
