## Goal
Move the `SHOW_FULL_AUTH_UI` feature flag from a hardcoded boolean in `LoginPage.tsx` to a Vite environment variable so it can be toggled without code changes.

## Changes

### 1. `.env`
Add:
```
VITE_SHOW_FULL_AUTH_UI=false
```

### 2. `src/vite-env.d.ts`
Add the env var to the `ImportMetaEnv` interface for TypeScript support:
```ts
interface ImportMetaEnv {
  readonly VITE_SHOW_FULL_AUTH_UI?: string;
  // ...existing vars
}
```

### 3. `src/pages/LoginPage.tsx`
Replace:
```ts
const SHOW_FULL_AUTH_UI = false;
```
with:
```ts
const SHOW_FULL_AUTH_UI = import.meta.env.VITE_SHOW_FULL_AUTH_UI === "true";
```

## How to toggle
- Set `VITE_SHOW_FULL_AUTH_UI=true` in `.env` and restart the dev server to show the full auth UI.
- Set it to `false` (or omit it) for Google-only mode.

## Out of scope
No other files or functionality are affected.