## Current state

The toggle in `src/pages/ProfilePage.tsx` is just local `useState` — clicking it flips a variable that nothing reads. There is **no i18n setup at all** in the project:

- No translation library installed
- No translation files (no `en.json` / `es.json`)
- Every UI string across all pages is hardcoded in Spanish ("Jornada", "Mis ligas", "Cerrar sesión", etc.)
- No language column on the `profiles` table — the choice wouldn't survive a refresh

So "make the toggle functional" is really three pieces of work. I'd recommend doing them in order, and we can stop after any step.

## What needs to happen

### Step 1 — Wire up an i18n system (foundation)

- Install `react-i18next` + `i18next` (the standard React i18n stack, lightweight, no backend needed).
- Create a `LanguageProvider` (or just an i18next init file) loaded in `src/main.tsx` so every component can call `t("some.key")`.
- Create two translation files: `src/i18n/es.json` and `src/i18n/en.json`.
- Replace the local `useState` in `ProfilePage` with the global language from i18next, so clicking the toggle actually changes the active language.
- Persist the choice to `localStorage` so it survives refresh for logged-out users too.

After this step, the toggle "works" technically — but nothing visibly changes yet because no strings have been translated.

### Step 2 — Translate the UI strings

Walk through each page/component and replace hardcoded Spanish with `t("key")` calls, adding both Spanish and English entries to the JSON files. Scope:

- `BottomNav`, `TopBar`
- `LandingPage`, `LoginPage`
- `PicksPage`, `ResultsPage`, `MatchCard`, `ResultCard`
- `LeaguesListPage`, `LeaguePage`, `CreateLeaguePage`, `LeaderboardRow`
- `ProfilePage`, `AboutPage`
- `AdminPage` (lower priority — admin-only)
- Toast messages (`toast.success("Nombre guardado")` etc.)

This is the bulk of the work — probably ~150–250 strings. We can do it all at once or page-by-page.

**Not translated** (intentionally): team names, jornada numbers, user-generated content (league names, display names).

### Step 3 — Persist preference per user (optional polish)

- Add a `language` column to the `profiles` table (default `'es'`).
- On login, read `profile.language` and set i18next accordingly.
- On toggle, save back to the profile (in addition to `localStorage`).

Without this, the language is per-device. With it, the user's choice follows them across devices.

## Technical details

- **Library**: `react-i18next` — battle-tested, tiny, hook-based (`const { t, i18n } = useTranslation()`).
- **Key structure**: namespace by feature, e.g. `profile.signOut`, `picks.lockCountdown`, `nav.leagues`. Keeps the JSON files navigable.
- **Default language**: `es` (current behavior). English is the alternate.
- **Date/number formatting**: i18next handles this via `Intl` — match dates and countdowns will format correctly per locale once we use the formatter helpers.

## Recommended scope for this round

I'd suggest **Step 1 + Step 2** together so the toggle visibly does something the moment we ship. Step 3 (DB persistence) can come later — `localStorage` is enough for a single-device pick'em app and avoids a migration right now.

Let me know if you want all three, just 1+2, or just Step 1 (foundation only, then translate gradually).