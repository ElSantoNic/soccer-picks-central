

## Wire the Resultados page to live Supabase data

### What's wrong

`src/pages/ResultsPage.tsx` is still rendering hard-coded mock arrays from `src/lib/mockData.ts` (`completedJornada` = J9, `completedMatches` = made-up rows). It never queries Supabase, so your real J15 results — which are correctly stored and scored in the DB — can't appear.

### Fix

Rewrite `ResultsPage.tsx` to load real data from Supabase for the signed-in user.

**Data to fetch (single page load):**

1. Most recent **completed jornada** = the jornada with the highest `jornada_number` that has at least one match where `result_1x2 IS NOT NULL`. (Using "has results" rather than `status` so it works regardless of whether the jornada is still marked `open`.)
2. All `matches` for that jornada, ordered by `kickoff_utc`.
3. The user's `picks` for those matches (`auth.uid()` filter, RLS already enforces this).

**What the page renders:**

- Header card: "Jornada {N} completada" + total points for the user this jornada (sum of `points_awarded` across their picks for that jornada) + "+X pts esta jornada" pill.
- One `ResultCard` per match, joining each match to the user's pick:
  - `homeTeam`, `awayTeam`, `homeScore`, `awayScore` from `matches`
  - `userPick` from the user's `picks` row (or `null` if they didn't pick)
  - `isCorrect` from `picks.is_correct` (or `false` if no pick)
- Matches without a result yet are excluded (so partially-completed jornadas only show finished games).

**States:**

- Loading → skeleton placeholders for the summary card + 9 rows.
- Not signed in → friendly prompt with a button to `/auth` (no picks to show otherwise).
- No completed jornada in DB → empty state: "Aún no hay resultados para mostrar."

### Out of scope (not changing now)

- `src/lib/mockData.ts` stays for other pages still using it (`PicksPage`, etc.). We only stop importing `completedJornada` / `completedMatches` from `ResultsPage`.
- No DB schema changes. RLS on `picks` already restricts to the signed-in user, which is exactly what we want.

### Files touched

- `src/pages/ResultsPage.tsx` — replace mock imports with a `useEffect` + Supabase queries; add loading / empty / signed-out states. No other files change.

