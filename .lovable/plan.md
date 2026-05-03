## Feedback first

Yes — the current single "Tabla" view conflates two different questions:

- "Who won this week?" (jornada points)
- "Who's winning the season?" (total points)

Right now we sort by `points_total` and show the small `+N pts` jornada delta as secondary text. Users scanning quickly read the big number as "the score," so the jornada result gets lost. Splitting them is the right call.

## Proposed change

Inside the existing `Tabla` tab on `LeaguePage`, add a sub-toggle with two views:

1. **Jornada** (default when there's an active/just-closed jornada) — sorted by `points_jornada` desc, big number = jornada points, small text = season total.
2. **General** — sorted by `points_total` desc, big number = season total, small text = `+N pts` this jornada (current behavior).

The `Miembros` tab stays as-is.

### UI sketch

```text
[ Tabla ] [ Miembros ]
 ├─ ( Jornada | General )      ← segmented control
 └─ ranked rows
```

- Segmented control sits just under the tab bar, matches existing pill/tab styling.
- Medals (🥇🥈🥉) reflect the active sort.
- Add a small caption above the list: "Jornada 12 · cierra dom 8pm" (General view shows "Temporada 2025/26"). Pulls from the current open/most-recent jornada.

### Technical notes

- `LeaderboardRow` gains a `mode: 'jornada' | 'overall'` prop. Swap which value is the bold primary number vs the muted secondary line. No data shape changes.
- `LeaguePage` adds `standingsView` state, sorts `members` by the chosen field before rendering.
- Fetch the current jornada label once (cheap query: `jornadas` order by `jornada_number desc limit 1`) for the caption. If none, hide the caption.
- i18n keys to add (en/es): `league.standingsJornada`, `league.standingsOverall`, `league.jornadaLabel`, `league.seasonLabel`.
- Empty-jornada handling: if every member has `points_jornada === 0`, show a small hint "Aún no hay resultados de esta jornada" in the Jornada view instead of an all-zeros list.

### Files

- `src/pages/LeaguePage.tsx` — add sub-tab state, sort logic, caption.
- `src/components/LeaderboardRow.tsx` — `mode` prop, conditional primary/secondary number.
- `src/i18n/locales/en.json`, `src/i18n/locales/es.json` — new strings.

### Out of scope

- No schema changes, no new RPCs.
- Not adding per-jornada history navigation yet (could be a follow-up: tap the caption → pick a past jornada). Happy to scope that next if you want it.
