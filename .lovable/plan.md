## Problem

On `/picks/results`, the Picks tab (ball icon) is highlighted instead of Resultados (clipboard). 

In `src/components/BottomNav.tsx`, active tab detection uses:

```ts
tabs.find(t => location.pathname.startsWith(t.path))
```

Since `picks` (`/picks`) is listed before `results` (`/picks/results`), `startsWith('/picks')` matches first for any `/picks/...` route, so Picks always wins.

## Fix

Update the matching logic in `BottomNav.tsx` to prefer the most specific (longest) matching path. Two equivalent options — I'll go with the simpler one:

- Sort matches by path length descending and pick the longest match:
  ```ts
  const activeTab = [...tabs]
    .sort((a, b) => b.path.length - a.path.length)
    .find(t => location.pathname === t.path || location.pathname.startsWith(t.path + '/'))
    ?.id ?? 'picks';
  ```

This also tightens `startsWith` to require a `/` boundary so `/picksy` wouldn't accidentally match `/picks`.

## Files

- `src/components/BottomNav.tsx` — single small change to `activeTab` calculation.

No i18n, routing, or styling changes needed.
