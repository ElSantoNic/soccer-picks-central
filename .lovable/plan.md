## Goal
Let league creators (admins) remove members from their league.

## Database changes
The `league_members` table currently has no DELETE policy, so nobody can delete rows. Add a migration:

1. **RLS DELETE policy** on `league_members`:
   - Allow delete when `auth.uid() = (SELECT created_by FROM leagues WHERE id = league_members.league_id)`
   - Prevent the creator from removing themselves (optional safeguard): `AND user_id IS DISTINCT FROM (SELECT created_by FROM leagues WHERE id = league_members.league_id)`
2. **Cascade cleanup (optional, recommended)**: When a member is removed, their picks remain (they belong to the user globally, not the league), so no extra cleanup needed. Points on `league_members` are deleted with the row — fine.

## UI changes (`src/pages/LeaguePage.tsx`)
1. Determine `isCreator = user?.id === league.created_by`.
2. In the **Miembros** tab, show a small "Remove" (trash icon) button on each member row, only when `isCreator` is true and the member is not the creator themselves.
3. On click, open a confirmation `AlertDialog` ("Remove {display_name} from {league.name}?").
4. On confirm: `supabase.from('league_members').delete().eq('id', member.id)`, then update local state and toast success/error.
5. Also add a remove control on the **Tabla** tab via `LeaderboardRow` — out of scope to keep change minimal; admins can switch to Miembros tab to remove.

## i18n keys to add (`es.json` + `en.json`)
- `league.removeMember` — "Eliminar" / "Remove"
- `league.removeConfirmTitle` — "¿Eliminar miembro?" / "Remove member?"
- `league.removeConfirmDesc` — "{{name}} ya no formará parte de {{league}}." / "{{name}} will no longer be part of {{league}}."
- `league.removeSuccess` — "Miembro eliminado" / "Member removed"
- `league.removeError` — "No se pudo eliminar al miembro" / "Could not remove member"
- `common.cancel`, `common.confirm` (reuse if existing)

## Technical notes
- Use existing `AlertDialog` from `@/components/ui/alert-dialog`.
- Use `Trash2` icon from `lucide-react`.
- Toast via existing `use-toast` hook (already used elsewhere).
- After successful delete, filter `members` state to drop the removed row — no refetch needed.
- The creator row is hidden from the remove control to prevent accidental self-removal (DB policy also blocks it as defense in depth).

## Files touched
- New migration: add DELETE policy on `league_members`.
- `src/pages/LeaguePage.tsx` — add remove UI + handler.
- `src/i18n/locales/es.json`, `src/i18n/locales/en.json` — new strings.