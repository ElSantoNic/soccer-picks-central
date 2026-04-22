

## Add CSV format hint to Results Upload + upload your file

### What you'll see in the Admin → Results Upload tab

A clear, scannable format card above the drop zone showing exactly what the CSV needs to look like:

```text
Required columns:  match_id, home_score, away_score

Example:
  match_id,home_score,away_score
  MX-2026-J15-01,2,1
  MX-2026-J15-02,0,0
  MX-2026-J15-03,1,3

Notes:
  • match_id must match the IDs from your Schedule Upload (case-sensitive)
  • Scores are whole numbers; ties are allowed
  • Result (1 / X / 2) is computed automatically
```

Same pattern (smaller info card) will be added to **Schedule Upload** for consistency, showing its expected columns.

### After the UI change

I'll upload your `match_results.csv` (the file you just attached) via the Results Upload flow and report back:
- rows updated
- any row-level errors
- confirmation that picks were scored and `league_members` totals updated

### Files touched

- `src/pages/AdminPage.tsx` — add a format-hint card inside `ResultsUpload` (and a matching one in `ScheduleUpload`), no logic changes.
- Then run the results upload using your provided CSV.

