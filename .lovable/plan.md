## Goal
Grant `/admin` access to user UID `ffebf961-d8ae-48f5-8161-045c58cf6cf4`.

## Change
Insert one row into `public.admin_users`:

```sql
INSERT INTO public.admin_users (user_id)
VALUES ('ffebf961-d8ae-48f5-8161-045c58cf6cf4')
ON CONFLICT DO NOTHING;
```

That is the only change. `ProtectedAdminRoute` and the `is_admin()` SQL function both check membership in `admin_users`, so this single insert unlocks `/admin` for that user. No code changes needed.

After approval, the user should sign out and back in (or refresh) to pick up admin status.