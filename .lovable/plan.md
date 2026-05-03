# Liga MX Liguilla Foundation

Add playoff (Cuartos / Semifinal / Final, Ida / Vuelta) support without changing scoring or lock logic. Each leg remains its own jornada, scored independently as 1/X/2.

## 1. Database migration

Add two nullable columns to `jornadas`:

- `stage text NOT NULL DEFAULT 'regular'` — values: `regular`, `cuartos`, `semifinal`, `final`
- `leg text NOT NULL DEFAULT 'single'` — values: `single`, `ida`, `vuelta`

Add a CHECK constraint restricting allowed values for both. Backfill all existing rows with `regular` / `single` (covered by defaults).

No changes to `matches`, `picks`, RLS, or any trigger. The existing "one open jornada" rule continues to work — a Cuartos Ida leg is just the next open jornada.

## 2. CSV format

### Schedule CSV — adds 2 optional columns

```
match_id,jornada_number,stage,leg,home_team,away_team,kickoff_utc
```

- `stage` optional → defaults to `regular`
- `leg` optional → defaults to `single`
- Existing regular-season CSVs keep working unchanged

Parser changes in `ScheduleUpload` (`AdminPage.tsx`):
- Detect `stage` / `leg` columns by header name
- Validate values against allowed sets; report row-level errors
- When auto-creating a jornada (jornada_number not yet in DB), insert with the row's `stage` and `leg`
- All rows sharing a `jornada_number` must agree on `stage`/`leg` (validation error otherwise)

### Results CSV — no changes

Still `match_id, home_score, away_score`. Per-leg 1/X/2 scoring unchanged.

## 3. Admin UI

`JornadaManager`:
- Add `Stage` and `Leg` selectors next to the Create form (default Regular / Single)
- Show stage/leg as a small badge next to "Jornada N" in the list (hide badge when regular/single)

`ScheduleUpload`: update the documentation block to show the new columns and a playoff example row.

## 4. App UI labels

Add a small helper `formatJornadaLabel(jornada)` and use it everywhere the current "Jornada N" label is rendered:

- `LeaguePage` header (`league.jornadaLabel`)
- `PicksPage` header
- `ResultsPage` jornada list + completed banner

Output:
- Regular season → `Jornada 17` (unchanged)
- Playoffs → `Cuartos — Ida`, `Cuartos — Vuelta`, `Semifinal — Ida`, `Final — Vuelta`, etc.

## 5. i18n

Add to `en.json` / `es.json` under a new `stage` namespace:

```
stage.regular, stage.cuartos, stage.semifinal, stage.final
leg.ida, leg.vuelta, leg.single
```

EN: "Quarterfinals / Semifinal / Final / 1st Leg / 2nd Leg"
ES: "Cuartos / Semifinal / Final / Ida / Vuelta"

## Out of scope (follow-up)

- Aggregate-winner picks ("who advances")
- Bracket visualization
- Round-specific point multipliers
- Away-goals / penalty tiebreaker logic
