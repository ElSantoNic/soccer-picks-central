## Goal
Inside `/admin`, add an "Admin Access" section where current admins can grant or revoke `/admin` access by **user UID or email**, so you stop needing migrations for each new admin.

## UX
New tab "Admin Access" in `AdminPage.tsx`:
- Input: "User UID or email"
- Button: **Grant admin access**
- List of current admins (email + UID + **Revoke** button)
- Toast feedback on success/error
- Cannot revoke yourself (safety)

Only reachable through `ProtectedAdminRoute`, so already gated to admins.

## Technical

**New edge function** `supabase/functions/admin-manage-access/index.ts`
- Validates caller's JWT and confirms they exist in `admin_users` (uses `SUPABASE_SERVICE_ROLE_KEY` server-side).
- Accepts `{ action: "grant" | "revoke" | "list", identifier?: string }`.
  - `grant`: if `identifier` matches UUID regex → use directly; else look up by email via `supabase.auth.admin.listUsers` (paginated). Insert into `admin_users` with `ON CONFLICT DO NOTHING`.
  - `revoke`: resolve same way, refuse if target == caller, delete row.
  - `list`: return `admin_users` joined with email from `auth.users`.
- Service role key never leaves the function.

**New component** `src/components/admin/AdminAccessManager.tsx`
- Calls the edge function via `supabase.functions.invoke`.
- Renders input, grant button, admin list with revoke buttons, sonner toasts.

**Edit** `src/pages/AdminPage.tsx`
- Add `'access'` tab and mount `<AdminAccessManager />`.

No DB migration needed — `admin_users` and `is_admin()` already exist. No audit log, no invite flow for users who haven't signed up.