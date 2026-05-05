## Problem

In the account-deletion flow, "Transfer league" and "Delete league I own" both appear to do nothing. Root causes:

1. `handleDeleteLeague` calls native `window.confirm(...)` which is unreliable inside the Lovable preview iframe — when it returns false, the RPC is never called and nothing visible happens.
2. The "Transfer ownership" UI is rendered as a `<Dialog>` nested inside the parent `<Dialog>`. Radix doesn't support stacked dialogs cleanly: focus traps and `pointer-events: none` from the outer overlay can make the inner dialog's buttons unclickable.
3. RPC errors are swallowed — only a generic toast is shown, no `console.error`, so real failures (e.g. RLS, "not a member") are invisible.

## Fix

### `src/components/DeleteAccountDialog.tsx`

- Replace `window.confirm` for "Delete league" with an inline confirmation step inside the same dialog (a small confirm banner with "Cancel / Confirm delete" buttons under the league row when the user clicks delete).
- Replace the nested `<Dialog>` for transfer with an inline panel that swaps the dialog body when a league is selected for transfer (back button returns to the list). This avoids the stacking issue entirely and keeps the flow inside one dialog.
- Add `console.error` logging on every RPC error and surface the Postgres `error.message` in the toast so future failures are debuggable.
- Guard the member list: skip members whose `user_id` is null (those can't receive ownership) instead of rendering them as selectable.
- After a successful transfer or league delete, refresh the owned-leagues list and, if the list is now empty, focus the "type DELETE" confirm input.

### No DB changes required

The `transfer_league_ownership`, `delete_league`, and `get_owned_leagues_blocking_deletion` functions and the `leagues` DELETE RLS policy are already in place and correct. No migration needed.

### QA

After changes, manually verify on the user's current league (`Los de la Terced Edad!`):
- Open Profile → Delete account.
- For a multi-member league: pick "Transfer", select another member, confirm — league disappears from the list.
- For a solo league: pick "Delete league", confirm inline — league disappears.
- Once list is empty, type DELETE and confirm the account-deletion button enables.
