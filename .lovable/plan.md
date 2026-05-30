# League invite deep links (`/l/:joinCode`)

Make shared league invite URLs (e.g. `https://fcquiniela.app/l/7126`) land recipients directly on a join screen for that league, with sign-in resumption when needed.

## 1. Fix invite URL in `CreateLeaguePage.tsx`

- Replace the bare string `fcquiniela.app/l/${joinCode}` with the full absolute URL `https://fcquiniela.app/l/${joinCode}`.
- This single value powers the displayed URL, the WhatsApp `wa.me/?text=...` message, and the clipboard copy — so all three update at once.
- Keep `inviteMsg` using the same constant via `t("createLeague.inviteMessage", { name, url: inviteUrl })`.

## 2. New route `/l/:joinCode` → `JoinLeaguePage`

Create `src/pages/JoinLeaguePage.tsx` and register it in `src/App.tsx` (`<Route path="/l/:joinCode" element={<JoinLeaguePage />} />`).

Behavior:

1. On mount, read `joinCode` from `useParams`, call `supabase.rpc('find_league_by_code', { _code: joinCode })` (already exists, SECURITY DEFINER → works for anon and authenticated users).
2. Render states:
   - **Loading** — spinner / "Cargando...".
   - **Not found** — message "Este enlace no es válido o la quiniela no existe." + button "Ir al inicio" → `/`.
   - **Found** — show league name, short subtitle ("Te invitaron a unirte a esta quiniela") and a primary "Unirse a la quiniela" button.
3. If authenticated **and already a member** (check `league_members` for `league_id` + `user_id`), `navigate(`/league/${id}`, { replace: true })` immediately — no duplicate insert.
4. Tap "Unirse":
   - If **not authenticated** → `sessionStorage.setItem('pendingJoinCode', joinCode)` then `navigate('/auth')`. The user can pick any sign-in method (Google, email OTP, SMS, password) — all paths are handled by the resume hook below.
   - If **authenticated** → insert into `league_members` (same shape as `LeaguesListPage.handleJoin`: `display_name` from profile or "Jugador", `avatar_emoji` from profile or "⚽"). Treat insert conflict `23505` as "already a member". On success or already-member, navigate to `/league/${id}`.

## 3. Resume join flow after auth

Hook into `AuthContext` so resumption works regardless of which sign-in method the user picked (Google OAuth redirect, OTP verify, password):

- In `src/contexts/AuthContext.tsx`, inside the `onAuthStateChange` callback, when `_event === 'SIGNED_IN'` and `sessionStorage` has `pendingJoinCode`, read + remove it and `window.location.replace(`/l/${code}`)`. Using `window.location` avoids needing router access from the context and works for the Google OAuth full-page redirect.
- `JoinLeaguePage`'s existing "authenticated → join" logic then takes over and completes membership insertion.

Edge cases:
- `LoginPage` already redirects to `/picks` after sign-in. The new `SIGNED_IN` listener fires first and replaces the location to `/l/:code`, so the user lands on the join screen, not the homepage.
- Clear `pendingJoinCode` even if the join later fails, to avoid loops.

## 4. i18n strings (`src/i18n/locales/es.json` + `en.json`)

Add a new `joinLeague` namespace:
- `title`: "Te invitaron a una quiniela"
- `subtitle`: "Únete para hacer tus picks de esta jornada."
- `joinCta`: "Unirse a la quiniela"
- `joining`: "Uniéndose..."
- `alreadyMember`: "Ya eres miembro de esta quiniela."
- `notFoundTitle`: "Enlace no válido"
- `notFoundDesc`: "Este enlace no es válido o la quiniela no existe"
- `goHome`: "Ir al inicio"
- `signInPrompt`: "Inicia sesión para unirte"

## 5. Files touched

- **Edit** `src/pages/CreateLeaguePage.tsx` — absolute invite URL.
- **Edit** `src/App.tsx` — register `/l/:joinCode` route.
- **Edit** `src/contexts/AuthContext.tsx` — resume `pendingJoinCode` on `SIGNED_IN`.
- **Edit** `src/i18n/locales/es.json` and `en.json` — `joinLeague` namespace.
- **Create** `src/pages/JoinLeaguePage.tsx` — the join screen.

## Acceptance check

| Scenario | Where it's satisfied |
|---|---|
| Absolute invite URL displayed/copied/WhatsApp | Step 1 |
| Recipient lands on `/l/:code` and sees league + join button | Step 2 (states 1+3) |
| Unauthenticated → sign in → return to same screen | Steps 2 + 3 |
| Already a member → straight to `/league/:id` | Step 2 (mount check + insert conflict) |
| Invalid code → friendly error + home button | Step 2 (not-found state) |

No DB migration, no edge function, no new dependencies.