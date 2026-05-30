## Goal
Improve the loading and error UI on `JoinLeaguePage.tsx` so the experience feels polished while the league is fetched and when an invalid join code is encountered.

## Changes

### 1. Loading state
- Replace the plain "Loading…" text with a centered, animated `Loader2` spinner from `lucide-react` plus a short label ("Buscando quiniela…").
- Wrap it in the same `max-w-lg mx-auto` container for layout consistency.

### 2. Error states (clearer separation)
- **Not found** (invalid join code): keep the existing card layout but add a small icon variation and a secondary hint line (e.g. code shown to the user) so it’s unmistakable that the link is broken.
- **Network / RPC error**: add a new error card (distinct from "not found") with an `AlertCircle` icon, a "No se pudo cargar la quiniela" message, and a **Retry** button that re-runs the fetch.
- Use the shadcn `Alert` variant style (destructive) for the network error card to visually distinguish it from the empty-state "not found" card.

### 3. Styling consistency
- Ensure both loading and error states use the same page shell (`min-h-screen bg-background`, `TopBar`, `max-w-lg mx-auto px-4 py-10`) so there is no layout jump when the real content loads.

## i18n
Add the new strings to `es.json` and `en.json` under the `joinLeague` namespace:
- `searching` / `searchingTitle`
- `networkError` / `retry`

## Files touched
- `src/pages/JoinLeaguePage.tsx`
- `src/i18n/locales/es.json`
- `src/i18n/locales/en.json`

No new dependencies or backend changes needed.