## Problem

`LeaguePage.tsx` always loads the single newest jornada (highest `jornada_number`) and passes it to `MemberPicksDialog`. After J19 (Vuelta) was uploaded, "current jornada" became J19. J19 is still `open` (not locked), so `get_member_picks` returns nothing for other members — and there is no UI to switch back to J18 (Ida), which is locked/in-progress and should still be viewable.

The standings "Jornada" tab is also pinned to J19, so the J18 leaderboard becomes inaccessible the moment J19 is created.

## Fix

Add a jornada selector to the League page that drives both the standings view and the per-member picks dialog.

### 1. Fetch jornadas list
In `src/pages/LeaguePage.tsx`, replace the single-jornada query with a list:
- Select `id, jornada_number, season, stage, leg, status` from `jornadas`, ordered by `jornada_number desc`, limited to ~20 most recent.
- Default `selectedJornada` to: the newest `locked`/`complete` jornada if one exists, otherwise the newest jornada overall. This way, immediately after uploading J19 (open), the page still defaults to J18 (locked) — matching the user's mental model of "the jornada in play".

### 2. Add a selector UI
Above the standings tabs (or inline with the "Jornada N" subtitle), add a compact dropdown / segmented control listing recent jornadas using `formatJornadaLabel` for each option (e.g. "Jornada 19", "Cuartos — Ida"). Selecting one updates `selectedJornada` state.

### 3. Wire selection through
- Pass `selectedJornada` (instead of `currentJornada`) to `MemberPicksDialog`.
- Recompute `points_jornada` displayed in the standings: since `league_members.points_jornada` is only kept in sync with the currently-open jornada, when the user picks a non-open jornada we need real per-jornada totals. Add a small query that, when `standingsView === 'jornada'` and `selectedJornada` is set, calls a new RPC `get_league_jornada_points(_league_id, _jornada_id)` returning `{ user_id, points }`, and merge those into the displayed rows.

### 4. New RPC (migration)
Create `public.get_league_jornada_points(_league_id uuid, _jornada_id uuid)`:
- `SECURITY DEFINER`, `STABLE`, `search_path = public`.
- Auth check: caller must be a league member or the league creator (same pattern as `get_member_picks`).
- Returns `user_id uuid, points integer` summed from `picks` joined to `league_members` for that league + jornada.

This lets the leaderboard show correct per-jornada scores for any past jornada without changing the existing `league_members.points_jornada` invariant.

### 5. Empty/edge states
- If selected jornada is `open` and not the caller's, `MemberPicksDialog` already shows the "hidden until lock" message — keep as is.
- "All zeros" empty state for the jornada standings view continues to work using the merged points.

## Files

- `src/pages/LeaguePage.tsx` — fetch jornadas list, add selector, default to newest locked, wire selectedJornada through.
- `src/i18n/locales/{en,es}.json` — add `league.selectJornada` label.
- New migration — create `get_league_jornada_points` RPC.

## Out of scope

No change to `MemberPicksDialog`, `get_member_picks`, or the scoring trigger. No change to how `league_members.points_jornada` is maintained.
