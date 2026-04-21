

## Set up password login for nick.santana@gmail.com

Since you've hit the email send limit, we'll bypass OTP entirely with a password. I can't set the password from here directly, but I'll build a tiny secure flow that lets you set one yourself in 30 seconds, then log in with email + password from then on — no emails ever sent.

### Approach

**Edge function `admin-set-password`** (server-side, uses service role key):
- Accepts `{ email, newPassword, setupSecret }`
- Verifies `setupSecret` matches a Supabase secret (`ADMIN_PASSWORD_SETUP_SECRET`) so randos can't hit it
- Verifies `email === 'nick.santana@gmail.com'` (hardcoded allowlist — single-purpose function)
- Calls `supabase.auth.admin.updateUserById(userId, { password: newPassword })` using the service role client
- Returns success

**Update `src/pages/LoginPage.tsx`**:
- Add a third tab/mode: **"Contraseña"** (Password)
- Email + password fields → calls `supabase.auth.signInWithPassword()`
- Below the login button, a small "¿Primera vez? Configurar contraseña" link that opens a modal:
  - Email (prefilled), new password, setup secret (you paste it once)
  - Calls the `admin-set-password` edge function
  - On success: auto-fills the login form and prompts you to sign in

### Setup steps you do once

1. **Add the secret** — I'll prompt you to set `ADMIN_PASSWORD_SETUP_SECRET` to any random string (e.g. `mySetup-2026-xyz`). I'll show the link to the secrets page.
2. **Open the app, click "Configurar contraseña"**, enter your email + chosen password + the secret, submit.
3. **Log in** with email + password from then on. No emails. No OTP.

### Technical details

- **New file**: `supabase/functions/admin-set-password/index.ts` — uses `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` (already configured) + new `ADMIN_PASSWORD_SETUP_SECRET`
- **Edited**: `src/pages/LoginPage.tsx` — add password mode + setup modal
- **Edited**: `supabase/config.toml` — register the new function with `verify_jwt = false` (it's gated by the setup secret instead)
- **No DB migration needed** — `auth.users.encrypted_password` is managed by Supabase
- **Security**: function is hardcoded to only work for your email + requires the secret. After you've set your password, you can delete the secret to permanently disable the endpoint, or I can remove the whole function.

### After password is set

You log in as admin → test the CSV upload → confirm RLS works for non-admin (we can use an incognito session with no login → `/admin` should redirect to `/auth`).

