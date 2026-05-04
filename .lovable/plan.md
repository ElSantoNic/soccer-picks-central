# Member Picks Visibility (Post-Lock)

Mirror the paper-quiniela tradition: once the picks window closes, everyone in a league can see everyone else's selections. Tapping a row on the league leaderboard opens that member's picks for the current jornada.

## UX

- On `LeaguePage` → **Tabla** tab, each row becomes tappable.
- Tapping opens a modal (Radix `Dialog`) titled with the member's name + jornada label.
- Body shows each match (home vs away, kickoff, final score if available) and the member's pick (1 / X / 2), with a ✓/✗ indicator if results exist.
- If the jornada is still **open** (picks not locked yet), tapping a row that is not your own shows a small message: "Las selecciones se mostrarán cuando cierre la jornada." Your own row always opens your picks.
- Empty state: "Este miembro no envió selecciones."

A subtle hint (chevron + cursor-pointer + hover bg) is added to rows so users discover the interaction. Add an aria-label like "Ver selecciones de {name}".

## Data access

Picks RLS today only lets a user read their own picks. We need league members to read each other's picks **only after the jornada is locked or complete**.

Add a Postgres security-definer RPC (preferred over loosening RLS):

```
get_member_picks(_league_id uuid, _user_id uuid, _jornada_id uuid)
  returns table(match_id uuid, pick text, is_correct boolean, points_awarded int)
```

Rules enforced inside the function:
1. `auth.uid()` must be a member of `_league_id` (or its creator).
2. `_user_id` must also be a member of `_league_id`.
3. Either `_user_id = auth.uid()` **OR** the jornada's `status` is `'locked'` or `'complete'`.
4. Otherwise return empty / raise.

This keeps the existing restrictive RLS on `picks` intact and exposes only the narrow, league-scoped, post-lock view.

## Frontend changes

- `src/components/MemberPicksDialog.tsx` (new): controlled dialog. Fetches matches for the jornada (already public-readable) + calls `get_member_picks` RPC. Renders a compact list.
- `src/pages/LeaguePage.tsx`:
  - Track `jornadaStatus` from the existing jornada query (already fetched — just add `status` to the select).
  - Wrap each `LeaderboardRow` in a `<button>` that sets `selectedMember` state.
  - Render `<MemberPicksDialog member={...} jornada={currentJornada} jornadaStatus={...} open={...} onOpenChange={...} />`.
- `LeaderboardRow.tsx`: add subtle affordance (hover bg, cursor) — keep visuals minimal.

## i18n keys (en + es)

- `league.viewPicksFor` — "Selecciones de {{name}}"
- `league.picksHiddenUntilLock` — "Las selecciones se mostrarán cuando cierre la jornada."
- `league.noPicksSubmitted` — "Este miembro no envió selecciones."
- `league.viewMemberPicks` — aria-label "Ver selecciones de {{name}}"

## Files

- **New migration**: `get_member_picks` RPC (security definer, search_path = public).
- **New**: `src/components/MemberPicksDialog.tsx`
- **Edit**: `src/pages/LeaguePage.tsx`, `src/components/LeaderboardRow.tsx`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json`
- No changes to existing `picks` RLS policies.

## Out of scope

- Showing picks comparison grid (all members at once) — can be a follow-up.
- Notifications / banner when the jornada locks.
- Sharing/export of picks.
