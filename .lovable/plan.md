## Goal

Add account deletion to ProfilePage, but block it when the user still owns leagues. Force them to either delete each owned league or transfer ownership to another member first.

## Why this matters

`leagues.created_by` is `ON DELETE SET NULL`. If we let a creator delete their account, their leagues become orphaned (no one can manage members, regenerate codes, or delete the league — `leagues` has no DELETE policy at all). So we gate deletion on owned leagues being resolved first.

`league_members` is `ON DELETE CASCADE` on `auth.users`, so a non-creator member's data cleans up automatically — no blocker there.

## UX (ProfilePage)

New "Danger zone" section at the bottom (above sign out or below it):

- **Delete account** button (destructive style).
- On click, open a confirmation dialog that first calls a new RPC `get_owned_leagues_blocking_deletion()`.
  - **If it returns leagues**: show the list with each league name, member count, and two actions per row:
    - "Transfer ownership" → opens a sub-dialog listing other members with a confirm button (calls `transfer_league_ownership` RPC).
    - "Delete league" → confirm + call `delete_league` RPC.
    - Show a notice: "You must resolve all owned leagues before deleting your account." The final delete button stays disabled while the list is non-empty.
  - **If empty**: show a final typed-confirmation step ("type DELETE to confirm"), then call edge function `delete-account` which removes the auth user. After success, sign out and navigate to `/`.

Solo-creator leagues (creator is the only member) can be deleted directly without transfer. Leagues with other members require either transfer or explicit delete.

## Backend changes

### Migration 1 — RPCs and policies

1. `public.get_owned_leagues_blocking_deletion()` `SECURITY DEFINER`, returns `(league_id uuid, name text, member_count int, can_solo_delete bool)` for leagues where `created_by = auth.uid()`.

2. `public.transfer_league_ownership(_league_id uuid, _new_owner uuid)` `SECURITY DEFINER`:
   - Caller must be current `created_by`.
   - `_new_owner` must be a `league_members` row in that league with non-null `user_id`.
   - Updates `leagues.created_by = _new_owner`.

3. `public.delete_league(_league_id uuid)` `SECURITY DEFINER`:
   - Caller must be `created_by`.
   - Deletes `league_members` for the league, then the `leagues` row.
   - (Picks are per-user, not per-league, so they stay.)

4. Add a DELETE policy on `leagues` for the creator (defense in depth) — though the RPC runs as definer, RLS should still permit creators to delete their own league rows directly if ever called from the client. Policy: `auth.uid() = created_by`.

### Migration 2 — pre-delete guard trigger on auth.users

We **cannot** modify `auth.users` per Supabase rules. Instead, the edge function performs the guard server-side before calling `auth.admin.deleteUser`.

### Edge function — `delete-account`

- Validates JWT (extracts `user_id`).
- Re-runs the "owned leagues" check via service-role client. If any exist → returns 409 with the list.
- Otherwise calls `supabase.auth.admin.deleteUser(user_id)`. CASCADE handles `profiles`, `admin_users`, `league_members`, `picks`. `leagues.created_by` becomes NULL only for leagues the user already transferred away (none should remain owned at this point).
- Returns 200 on success.

## Files

- `supabase/migrations/<new>.sql` — three RPCs + leagues DELETE policy.
- `supabase/functions/delete-account/index.ts` — new edge function (verify JWT in code, use service role, CORS).
- `src/pages/ProfilePage.tsx` — danger zone section + dialog flow.
- New `src/components/DeleteAccountDialog.tsx` — multi-step dialog (owned leagues resolution → typed confirm → delete).
- `src/i18n/locales/{en,es}.json` — copy for danger zone, transfer, delete league, typed confirm, errors.

## Out of scope

- Bulk transfer UI.
- Soft-delete / 30-day grace period (Supabase auth has no built-in undo; can revisit later).
- Cleaning up historical picks or anonymizing leaderboards in leagues the user transferred away.
