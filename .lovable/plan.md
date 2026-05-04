## Remove "Continue without account" escape hatch

### Changes

1. **`src/pages/LoginPage.tsx`** — Delete the `<button>` (in the `step === "input"` branch, just below the Google sign-in button) that calls `navigate("/picks")` with the `auth.continueWithoutAccount` label.

2. **`src/i18n/locales/en.json`** — Remove the `auth.continueWithoutAccount` key.

3. **`src/i18n/locales/es.json`** — Remove the `auth.continueWithoutAccount` key.

No other code references this string or path. Core pages (`PicksPage`, `ProfilePage`, `LeaguesListPage`) already self-gate on auth, so no router-level protection is needed.