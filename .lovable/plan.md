## Bug

In `src/pages/LeaguePage.tsx`, when the user picks a jornada from the "Tabla → Jornada" dropdown (e.g. "Cuartos — Vuelta"), the leaderboard renders the empty-state text **"Aún no hay resultados de esta jornada"** even after the admin has uploaded the match results.

### Root cause

The page hides the leaderboard whenever every member's per-jornada total is `0`:

```ts
const allJornadaZero = membersWithJornada.length > 0
  && membersWithJornada.every(m => m.points_jornada === 0);
```

`points_jornada` for each member comes from a `jornadaPoints` map populated by the `get_league_jornada_points` RPC. That map starts empty and is only filled when the RPC resolves. There are two ways the screen ends up blank:

1. **RPC failure swallowed silently.** The call destructures only `{ data }` and ignores `error`. If the RPC ever errors (auth race on session refresh, transient PostgREST hiccup), `data` is `null`, the map stays `{}`, every member resolves to `0`, and the empty state wins — even though the DB has scored picks (verified for league `Friends of Santana`, jornada 19: Eva 9, Nic 6, Nic2 9).
2. **Bad UX even when correct.** If a jornada genuinely has 0 points across the board (e.g. nobody picked, or no result yet), the page hides the entire standings list instead of showing the members at 0. That's misleading and indistinguishable from a real bug.

There is also a related data-quality issue we are NOT addressing in this fix (mentioning so it doesn't get conflated): `league_members.points_jornada` is stale for some users because the `score_match_results` trigger only refreshes the highest open jornada, and there are currently two open jornadas (J18 and J19). The per-jornada leaderboard does not depend on this column — it reads from `picks` via the RPC — so this fix stands on its own.

## Plan

Scope: frontend only, file `src/pages/LeaguePage.tsx`.

1. **Surface RPC errors instead of swallowing them.**
   - Destructure both `{ data, error }` from the `get_league_jornada_points` call.
   - On error: `console.error(error)` and show a `toast` with an i18n'd "Could not load standings" message so the failure is visible and we can diagnose recurrences.

2. **Stop hiding the leaderboard on all-zeros.**
   - Remove the `allJornadaZero` early-return for the row list.
   - Always render the sorted member rows when the league has members, even if everyone is at 0 for the selected jornada. This matches the "General" tab's behavior and makes the page reflect reality after a results upload.

3. **Replace the empty-state with a contextual hint.**
   - Above the rows (under the jornada selector), render a small muted caption only when the selected jornada has no scored picks yet: "No matchday results yet" / "Aún no hay resultados de esta jornada".
   - Detection: if `Object.keys(jornadaPoints).length === 0` after the RPC resolves successfully, OR if every returned `points` is 0 AND the underlying matches have no `result_1x2` set. To avoid an extra query, the simple, sufficient signal is: the RPC returned successfully and the sum of all `jornadaPoints` values is 0. Show the caption in that case but keep the rows visible underneath.

4. **i18n.**
   - Reuse existing `league.noJornadaResults` for the caption.
   - Add a new key `league.standingsLoadError` in `src/i18n/locales/{en,es}.json` for the toast.

5. **Verification.**
   - Build runs automatically.
   - Manually verify in the preview against the `Friends of Santana` league with "Cuartos — Vuelta" selected: rows should now show Eva 9, Nic2 9, Nic 6, others 0, and no empty-state takeover.
   - If the toast fires, capture the RPC error from the console for follow-up.

### Out of scope (separate bugs to address next)

- Stale `league_members.points_jornada` when more than one jornada is open at once (trigger logic in `score_match_results`).
- Multiple jornadas being left in `status='open'` simultaneously (J18 and J19 are both open today).
