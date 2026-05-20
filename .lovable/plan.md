## Goal
Make account deletion work for league owners, including this exact case:
- User `3fb089e3-b28e-4e2a-a653-09082ef3421e`
- League `Los de la Terced Edad!` (`7859`)
- Only 1 member remains

## Findings
- The database matches the report: league `7859` is owned by that user and currently has only one member row, so the user should be able to resolve the blocker by deleting the league and then deleting the account.
- The stored procedures needed for this flow already exist: `get_owned_leagues_blocking_deletion`, `transfer_league_ownership`, and `delete_league`.
- The current UI is still falling back to the generic "No se pudo eliminar la cuenta" path instead of reliably surfacing the owned-league resolution UI.

## Plan
1. Harden the delete-account dialog error handling.
   - Make the dialog reliably extract owned-league data from Edge Function conflict responses, even when Supabase returns a wrapped error object.
   - Prevent the flow from dropping back to the plain `DELETE` confirmation screen when the account still owns leagues.

2. Fix the solo-owner path.
   - Ensure a league with no other members clearly shows the "Eliminar quiniela" action.
   - After deleting the league, immediately refresh owned leagues and unlock account deletion without forcing the user to reopen the dialog.

3. Fix the transfer-owner path.
   - Verify the member-loading step excludes the current owner but still returns valid transferrable members.
   - Improve the transfer flow so failures are surfaced clearly instead of appearing as a dead end.
   - Confirm the UI only offers transfer when another eligible member exists.

4. Add targeted safeguards for stale or partial state.
   - Reset dialog state cleanly between list / transfer / confirm-delete views.
   - Avoid races where the initial owned-leagues RPC says one thing and the edge function says another.
   - Prefer the server response as the source of truth when deletion is blocked.

5. Validate the exact user scenario end-to-end.
   - Confirm the reported solo-owner account now sees the league-resolution UI.
   - Confirm a solo-owned league can be deleted, then the account can be deleted.
   - Confirm a multi-member league can transfer ownership successfully.

## Technical details
- Frontend scope: `src/components/DeleteAccountDialog.tsx` and any minimal surrounding profile wiring if needed.
- Backend scope: only if needed after verification; likely limited to `supabase/functions/delete-account/index.ts` for clearer conflict payloads or compatibility handling.
- No schema changes are planned unless debugging proves one of the existing RPCs is incorrect.

## Success criteria
- A user who still owns leagues never gets stuck on a generic delete-account error without a next step.
- A user with no remaining co-members can delete the league they own and then delete their account.
- A user with other members can transfer league ownership successfully from the same flow.