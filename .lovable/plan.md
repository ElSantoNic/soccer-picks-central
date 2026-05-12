## Bug

When the user opens **Profile → Eliminar cuenta**, the dialog skips the "you own leagues" view, shows the typed-`DELETE` input, and after submission only flashes the toast **"No se pudo eliminar la cuenta"** — never offering the transfer/delete-league flow.

## Root cause

Two compounding issues in `src/components/DeleteAccountDialog.tsx`:

1. **The 409 from `delete-account` is swallowed.** The edge function correctly returns
   ```json
   { "error": "owned_leagues", "leagues": [...] }
   ```
   with HTTP 409 (confirmed in edge logs: `POST | 409 | .../delete-account`). But `supabase.functions.invoke` treats any non-2xx as a thrown `FunctionsHttpError` — `data` is `null` and the JSON body lives on `error.context.response`. The current code does:
   ```ts
   if (error || (data as any)?.error) { ...
     if ((data as any)?.error === "owned_leagues") { await loadOwned(); return; }
     toast.error(t("deleteAccount.errDelete"));
   }
   ```
   `data` is `null`, so the `owned_leagues` branch is unreachable and the generic error toast fires. The user never gets bumped back to the transfer view.

2. **`loadOwned()` shouldn't be the only source of truth.** The dialog opens, calls `get_owned_leagues_blocking_deletion`, and based on the screenshot it returned `[]` for this session even though the server-side check then said the user does own a league. Whatever the cause (auth race, stale session, etc.), the UI should not rely solely on that RPC — the 409 response from the edge function is the authoritative answer and already carries the league list.

## How transfer is supposed to work

1. Dialog opens → calls `get_owned_leagues_blocking_deletion` → if rows come back, the user sees a list of owned leagues with **Transferir** (when there are other members) and **Eliminar liga** buttons.
2. **Transferir** opens a member picker that calls the `transfer_league_ownership(_league_id, _new_owner)` RPC.
3. **Eliminar liga** confirms in-line then calls the `delete_league(_league_id)` RPC.
4. Once the owned list is empty, the typed-`DELETE` input appears and submits to the `delete-account` edge function, which deletes the auth user.

The wiring exists; step 1 just isn't surviving the 409 when the initial RPC misses.

## Plan (frontend + edge function only)

### `src/components/DeleteAccountDialog.tsx`
- In `handleDeleteAccount`, when `error` is set, read the response body off the thrown `FunctionsHttpError`:
  ```ts
  const body = await (error as any)?.context?.response?.json?.().catch(() => null);
  ```
- If `body?.error === "owned_leagues"`:
  - Map `body.leagues` into the `OwnedLeague[]` shape and `setOwned(...)` directly, so the user immediately sees the transfer/delete list even when the initial RPC returned empty.
  - Reset `confirmText` and switch back to `view = { kind: "list" }`.
  - Show an info toast `t("deleteAccount.mustHandleLeagues")`: "Primero transfiere o elimina las ligas que posees."
  - Still call `loadOwned()` afterward to keep state fresh.
- Only fall through to the generic `errDelete` toast for genuine unknown errors.

### `supabase/functions/delete-account/index.ts`
- Enrich the 409 payload so the frontend can render the same UI without a second round-trip. Replace the `select("id, name")` with a query that joins `league_members` to compute `member_count` and `can_solo_delete` (other_member_count === 0), returning items shaped like the RPC: `{ league_id, name, member_count, can_solo_delete }`.

### `src/i18n/locales/{en,es}.json`
- Add `deleteAccount.mustHandleLeagues`:
  - en: "You still own leagues — transfer or delete them first."
  - es: "Aún eres dueño de ligas — transfiérelas o elimínalas primero."

### Verification
- In the preview, open Perfil → Zona de peligro → Eliminar cuenta with an account that owns a league. The dialog should now show the league with **Transferir** / **Eliminar liga** buttons, even if the initial RPC misses.
- Pick **Transferir**, choose a member, confirm — list refreshes and the league is gone.
- Once no leagues remain, type `DELETE` and submit — account deletion completes.

### Out of scope
- Why `get_owned_leagues_blocking_deletion` occasionally returns `[]` for an owner (likely an auth/session race) — the 409 fallback above masks it. If it keeps happening after this fix we can dig into the RPC separately.
