# Add Google Sign-In + Notification Channel Preference

## What we're building

1. A "Continuar con Google" button on the auth page (LoginPage.tsx) that uses Supabase OAuth.
2. A small schema change to the `profiles` table so each user has at least one valid contact (email **or** phone) and a `notification_channel` preference.
3. A soft nudge on the Profile page asking Google users (who only have an email) to add a WhatsApp number for jornada reminders.

> Note: the file is currently named `LoginPage.tsx` but mounted at `/auth` — that's the page you mean by "AuthPage".

---

## 1. Auth page UI changes (`src/pages/LoginPage.tsx`)

New layout for the input step (top to bottom):

```text
[ 📧 Correo ]  [ 📱 SMS ]  [ 🔑 Clave ]   ← existing tabs
< current input for selected tab >
[ Enviar código / Iniciar sesión ]         ← existing primary CTA

──────────  o también  ──────────          ← new divider

[  G  Continuar con Google  ]              ← new white button, dark text

¿Primera vez? Configurar contraseña        ← existing (password tab only)
Continuar sin cuenta →                     ← existing
```

- White background button with subtle border, dark text, the multi-color Google "G" SVG inline (no extra dependency).
- The divider is two thin lines with the text "o también" centered between them, in muted-foreground.
- On click: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ${window.location.origin}/picks } })`.
- Show `toast.error` on failure; success will redirect via Supabase, then `AuthContext` picks up the session and `LoginPage` auto-navigates to `/picks` (already wired via the existing `useEffect`).
- Hide the divider + Google button while we're in the OTP-verification step.

## 2. Database changes (one migration)

Add to `public.profiles`:
- `email TEXT NULL` — populated by the signup trigger from `auth.users.email`.
- `notification_channel TEXT NOT NULL DEFAULT 'none'` — allowed values: `'none' | 'email' | 'sms' | 'whatsapp'` (enforced by a CHECK constraint, immutable so safe).

Backfill:
- `UPDATE profiles SET email = u.email FROM auth.users u WHERE profiles.user_id = u.id AND profiles.email IS NULL;`
- For existing rows, set `notification_channel = 'whatsapp'` if `phone` is present, else `'email'` if `email` is present, else `'none'`.

Integrity rule (the "either email or phone, never both null" requirement):
- Add a validation trigger (NOT a CHECK with subqueries) on `profiles` BEFORE INSERT/UPDATE that raises if `email IS NULL AND phone IS NULL`.

Update `handle_new_user()` trigger so newly created profiles capture both fields:
```sql
INSERT INTO public.profiles (user_id, display_name, phone, email, notification_channel)
VALUES (
  NEW.id,
  COALESCE(NEW.raw_user_meta_data->>'display_name',
           NEW.raw_user_meta_data->>'full_name',
           NEW.phone, NEW.email),
  NEW.phone,
  NEW.email,
  CASE
    WHEN NEW.phone IS NOT NULL THEN 'whatsapp'  -- phone signups opt-in by default
    ELSE 'none'                                  -- email/Google signups: opt-in later
  END
);
```

This satisfies the MVP rule: every user has at least one of `email`/`phone`, and Google users default to `notification_channel = 'none'`.

## 3. Profile page nudge (`src/pages/ProfilePage.tsx`)

- Extend `Profile` type in `AuthContext` to include `email: string | null` and `notification_channel: string`.
- Show contact line: prefer phone if present, otherwise email (the existing masking already handles both via `user.email`/`user.phone`).
- New soft-nudge card, shown only when `profile.phone` is null:

  ```text
  💬 Agrega tu número de WhatsApp para recibir
     recordatorios de la jornada.
     [ Agregar número ]
  ```

  The button opens a small input + "Guardar" that updates `profiles.phone` and (on success) sets `notification_channel = 'whatsapp'`. We only update the row; we do NOT touch `auth.users.phone` (that would require an OTP verification flow, out of scope for this MVP nudge).

- Keep the existing "Recordatorio por WhatsApp" toggle, but wire it to `notification_channel` (`'whatsapp'` ↔ `'none'`) so the preference actually persists. Disable it when no phone is on file.

## 4. Supabase dashboard step (manual, called out to the user)

The user must enable Google as an OAuth provider in the Supabase dashboard
(Authentication → Providers → Google) and add their Site URL + redirect URLs.
We'll surface a presentation-link to that page after the code lands.

---

## Technical details

- **Files touched**: `src/pages/LoginPage.tsx`, `src/pages/ProfilePage.tsx`, `src/contexts/AuthContext.tsx`, plus one new migration under `supabase/migrations/`.
- **No new dependencies** — Google "G" rendered as inline SVG.
- **Auth flow**: OAuth redirect lands back on `/picks`; the existing `onAuthStateChange` listener in `AuthContext` handles session pickup, and `handle_new_user` creates the profile row. No client-side profile insert needed.
- **RLS**: existing `profiles` policies (owner-only read/update) remain valid for the new columns.
- **Out of scope**: editing the OTP fallback for Google users, full notification delivery system, verifying the WhatsApp number via OTP from the Profile page.
