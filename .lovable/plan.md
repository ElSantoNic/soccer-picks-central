# Align invite deep-link flow with JTBD spec

The `/l/:joinCode` page and post-sign-in redirect already exist and cover the acceptance criteria end-to-end (fetches league by `join_code`, shows name + "Unirse a la quiniela", handles not-found, auto-redirects existing members, redirects unauthenticated users to `/auth`, and resumes the flow after sign-in). The only gap vs. the spec is the sessionStorage contract.

## Change

Rename the handoff key from `pendingJoinCode` (stores just the 4-digit code) to `pendingJoinUrl` (stores the full path `/l/{joinCode}`), so the auth callback navigates to a URL rather than reconstructing one.

## Files touched

1. **`src/pages/JoinLeaguePage.tsx`** — in `handleJoin`, when the user is not signed in, replace:
   ```ts
   sessionStorage.setItem("pendingJoinCode", joinCode);
   ```
   with:
   ```ts
   sessionStorage.setItem("pendingJoinUrl", `/l/${joinCode}`);
   ```

2. **`src/contexts/AuthContext.tsx`** — in the `SIGNED_IN` branch of `onAuthStateChange`, replace the `pendingJoinCode` block with:
   ```ts
   const pendingUrl = sessionStorage.getItem("pendingJoinUrl");
   if (pendingUrl && pendingUrl.startsWith("/l/")) {
     sessionStorage.removeItem("pendingJoinUrl");
     if (window.location.pathname !== pendingUrl) {
       window.location.replace(pendingUrl);
     }
   }
   ```
   (Keep the `startsWith("/l/")` guard to prevent open-redirect via a tampered sessionStorage value.)

3. **`src/pages/LeaguesListPage.tsx`** — no change needed; the manual "join by code" flow on this page redirects to `/auth` without setting any pending key, and that's fine.

## Out of scope

- No DB / RLS changes — `find_league_by_code` RPC and `league_members` insert policy already support the flow.
- No i18n changes — all strings (`joinLeague.*`) already exist.
- No routing changes — `/l/:joinCode` is already wired in `App.tsx`.
- `LoginPage` already shows Google-only auth (per the `VITE_SHOW_FULL_AUTH_UI` flag), so the "sign in if needed" step is a single tap.

## Verification

- Open `/l/{validCode}` while signed out → see league name + button → tap → land on `/auth` → sign in with Google → land back on `/l/{validCode}` → tap join → land on `/league/:id` as a member.
- Open `/l/{validCode}` while signed in and already a member → auto-redirect to `/league/:id`.
- Open `/l/{invalidCode}` → "not found" card with home button.
