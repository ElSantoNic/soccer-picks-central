

## Fix login loop: magic link not establishing session

**Problem**: You enter your email, Supabase sends a "magic link" email (not an OTP code), you click the link, but you land back on `/auth` not logged in. Meanwhile the UI is asking for a 6-digit code that never arrives.

**Root cause**: The login page calls `supabase.auth.signInWithOtp({ email })` without `shouldCreateUser`/`emailRedirectTo` options, and Supabase is sending a **magic link email** (the default template) instead of a 6-digit OTP. When you click the link, it redirects to your Site URL — but:

1. There is no route handling the auth callback (the URL contains `#access_token=...` or `?code=...` from the link)
2. The Site URL / redirect URLs in Supabase likely point somewhere that doesn't preserve the session
3. The UI is still sitting on the OTP-entry screen expecting a code that was never sent

The session token from the magic link is being discarded on redirect, so `onAuthStateChange` never fires with a logged-in user → back to `/auth`.

### Plan

**1. Force OTP code (not magic link) for email login**

Update `src/pages/LoginPage.tsx` `handleSendOtp`:
- Pass `options: { shouldCreateUser: true, emailRedirectTo: \`${window.location.origin}/picks\` }` to `signInWithOtp`
- This still sends a code, but ensures any link click also lands somewhere valid

**2. Update the Supabase email template to send the 6-digit token instead of (or in addition to) the magic link**

The default Supabase "Magic Link" template uses `{{ .ConfirmationURL }}`. We need it to surface `{{ .Token }}` so users can copy the 6-digit code. I'll guide you through updating the **Magic Link** template in the Supabase dashboard to:

```
Your code: {{ .Token }}
```

(Or scaffold branded Lovable auth email templates that render the token cleanly — optional.)

**3. Add a auth callback handler so clicking the magic link still works as a fallback**

Even with OTP, if a user clicks the link, Supabase appends `#access_token=...` to the redirect URL. The `supabase-js` client auto-detects this on page load **only if the URL is hit in the browser**. We need to:
- Ensure `/picks` (or `/`) is allowed in Supabase **Redirect URLs** allowlist
- Confirm `LoginPage` redirects to `/picks` after `onAuthStateChange` fires (add a `useEffect` watching `session` from `useAuth()` → navigate away if already logged in)

**4. Verify Site URL & Redirect URLs in Supabase**

I'll list what needs to be set:
- **Site URL**: `https://id-preview--a4934755-7b15-43e0-8134-e5497f7b0106.lovable.app`
- **Additional Redirect URLs**: add the preview URL + `lovableproject.com` variants + `http://localhost:*` for local dev

You'll need to update these in the Supabase dashboard — I'll provide the exact link.

### Technical changes

- **`src/pages/LoginPage.tsx`**:
  - Add `useAuth` + `useEffect` to redirect to `/picks` when `session` becomes non-null (handles magic-link callback case automatically)
  - Pass `emailRedirectTo: \`${window.location.origin}/picks\`` to `signInWithOtp`
- **No new files, no DB migration needed.**
- **Manual user steps** (I'll surface links):
  1. Set Site URL + Redirect URLs in Supabase Auth settings
  2. Edit the Magic Link email template to include `{{ .Token }}` so the 6-digit code is visible

After these changes: enter email → receive email containing both a code and a link → either paste the code OR click the link → land on `/picks` logged in.

