## Jornada switcher on Resultados

**File:** `src/pages/ResultsPage.tsx` (only). No DB/RPC/RLS changes.

### Loader
1. Fetch all `jornadas` (`id`, `jornada_number`) desc.
2. Fetch current user's `picks` (`match_id`, `jornada_id`, `pick`, `is_correct`, `points_awarded`) — RLS scopes to them.
3. From the user's picks, get the distinct `jornada_id`s, then fetch `matches` for those jornadas where `result_1x2 is not null`.
4. Build bundles:
   ```ts
   type JornadaBundle = {
     id: string;
     jornada_number: number;
     matches: MatchRow[];
     picksByMatch: Record<string, PickRow>;
   };
   ```
5. Keep only bundles with ≥1 user pick on a scored match. Sort desc by `jornada_number`.
6. Default `selectedId` = first (highest) bundle.

### UI
- Add a shadcn `<Select>` above the points card listing `"Jornada {n}"` for each played bundle. Hidden if only one bundle exists.
- Points card, "Resultados" header, and match list derive from the selected bundle via `useMemo`.
- Total points = sum of `points_awarded` in selected bundle.
- Empty state copy: *"Aún no tienes resultados. Cuando termine una jornada en la que participaste, aparecerá aquí."*
- Loading/error states unchanged.

### Verification
- Manually pick jornadas in the dropdown and confirm matches list and total points update accordingly.
