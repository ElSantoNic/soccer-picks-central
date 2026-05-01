## Goal

Remove the redundant avatar/ball button from the top-right of the header. Profile access is already handled by the **Perfil** tab in the bottom nav.

## Change

**`src/components/TopBar.tsx`** — In the right-side container (lines ~64-80):

- **Logged-in users**: remove the avatar `<button>` entirely. The right side renders nothing (the Jornada/countdown info on `/picks` stays where it is in the middle).
- **Logged-out users**: keep the existing **"Entrar"** button — it's a meaningful CTA, not a duplicate of bottom-nav functionality (the bottom nav is hidden on `/auth` and the landing page anyway).

Result: cleaner, less cluttered header. Single, unambiguous path to profile (bottom nav).

## Not changing

- `profile.avatar_emoji` field stays in the database — harmless, and we may surface it later (e.g., next to the user's name on leaderboards) if you want a personality touch somewhere non-redundant.
- Bottom nav, all other icon work from previous step.
