

## Persist picks + score them

Right now `Guardar mis picks` just shows a toast — nothing is written to the DB, so picks vanish on navigation. I'll add real persistence and scoring.

### What you'll experience

1. Open `/picks` — your previously saved picks for the open jornada are pre-filled.
2. Tap 1 / X / 2 to change any pick **until the jornada's first kickoff**. After that, the whole jornada is locked everywhere (no edits, no new picks).
3. Hit **Guardar mis picks** — every selected pick is upserted in one batch. Toast confirms success.
4. Navigate away and come back — picks are still there.
5. When the admin enters results for matches, points are calculated automatically (3 points per correct 1X2) and your `league_members.points_jornada` / `points_total` update across every league you're in.

### Database changes (one migration)

**New table `picks`** — one row per (user, match):
- `id uuid pk`
- `user_id uuid` (auth user)
- `match_id uuid` → matches.id
- `jornada_id uuid` → jornadas.id (denormalized for fast jornada queries)
- `pick text` ('1' | 'X' | '2', validated by trigger)
- `is_correct boolean` (null until match has a result)
- `points_awarded int default 0`
- `created_at`, `updated_at`
- Unique `(user_id, match_id)` so re-saving upserts cleanly

**RLS on `picks`**:
- SELECT: `auth.uid() = user_id` (you only see your own picks)
- INSERT/UPDATE: `auth.uid() = user_id` AND the pick's jornada is still before its first kickoff (enforced by a `BEFORE INSERT/UPDATE` trigger that reads the earliest `kickoff_utc` for that `jornada_id` — CHECK constraints can't do this because `now()` isn't immutable)
- No DELETE policy

**Scoring trigger on `matches`** — when an admin updates `result_1x2` from null → '1'/'X'/'2':
- For every pick on that match: set `is_correct`, set `points_awarded` (3 if correct, else 0)
- Recompute `league_members.points_jornada` (sum of points for picks in the currently-open jornada, per league member) and `points_total` (sum of all picks ever, per league member) for every league this user belongs to
- All in a single `SECURITY DEFINER` function so RLS doesn't get in the way

### Code changes

**`src/pages/PicksPage.tsx`**
- After loading matches, fetch existing picks for the current user + jornada and seed the `picks` state
- Compute jornada-wide lock: `isJornadaLocked = matches.some(m => new Date(m.kickoff_utc) <= now)` (first kickoff has passed). Pass this down so all `MatchCard`s lock together — replaces the per-match lock check
- Replace the fake `setTimeout` save with a real `supabase.from('picks').upsert([...], { onConflict: 'user_id,match_id' })`
- Show a saved-vs-unsaved indicator using a `dirty` flag (set true on any pick change, cleared after successful save)
- Require auth: if no session, redirect to `/auth` (Picks page currently doesn't gate this)

**`src/components/MatchCard.tsx`** — minor: drop the per-match lock styling in favor of a single jornada-locked banner above the list (cleaner UX since they all lock together).

### Out of scope for this task

- Per-league picks (you chose one set per user per jornada — simpler)
- Editing picks after kickoff (intentional — locked is locked)
- Push/email reminders before kickoff
- Tiebreakers in scoring (just 3 pts per correct pick for now)

### Files touched

- New migration: `picks` table + RLS + jornada-lock trigger + scoring function/trigger on `matches`
- `src/pages/PicksPage.tsx` — load existing picks, real upsert save, jornada-wide lock, auth gate
- `src/components/MatchCard.tsx` — remove per-match lock UI (jornada-level lock instead)

