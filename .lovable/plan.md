## Goal
Make invite links reflect whatever domain the app is served from (preview, production, custom domain).

## Scope
Most of the requested behavior is already in place:
- `/l/:joinCode` route → `JoinLeaguePage.tsx` (loading, not-found, error, signed-out, signed-in member/non-member flows).
- Spanish copy via `joinLeague.*` i18n keys, including the not-found message and "Unirse a la quiniela" CTA.
- `AuthContext` post-sign-in handler reads `sessionStorage.pendingJoinCode` and redirects to `/l/{code}`.

The only actual gap is the hardcoded invite domain.

## Change

### `src/pages/CreateLeaguePage.tsx`
Replace:
```ts
const inviteUrl = `https://fcquiniela.app/l/${joinCode}`;
```
with:
```ts
const inviteUrl = `${window.location.origin}/l/${joinCode}`;
```

That's the entire change. No other files, no i18n updates, no backend changes.

## Out of scope (intentionally not changing)
- Sign-in flow stays at `/auth` (Google + OTP + password) rather than jumping straight into Google OAuth.
- sessionStorage key stays `pendingJoinCode`.
