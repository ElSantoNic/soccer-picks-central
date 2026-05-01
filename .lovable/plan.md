## Problem

`league_members.display_name` is a snapshot copied from `profiles.display_name` when a user creates or joins a league. Updating the name in Profile only writes to `profiles`, so league rosters keep showing the old name. The `prevent_league_member_points_tampering` trigger also blocks the user from updating their own `league_members.display_name` directly.

## Fix

Make `profiles.display_name` the source of truth and propagate changes via a trigger.

### 1. Database migration

Create a `SECURITY DEFINER` function + trigger on `profiles`:

```sql
CREATE OR REPLACE FUNCTION public.sync_league_member_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name
     AND NEW.display_name IS NOT NULL
     AND length(trim(NEW.display_name)) > 0 THEN
    UPDATE public.league_members
    SET display_name = NEW.display_name
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_sync_league_member_display_name
AFTER UPDATE OF display_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_league_member_display_name();
```

The function runs as definer, so the existing `prevent_league_member_points_tampering` trigger sees `auth.uid()` as the calling user — but that trigger already short-circuits when the new value matches the old; here we deliberately change `display_name`, which the tampering trigger blocks. Fix by short-circuiting tampering checks for elevated/system contexts only when the calling function is the sync trigger. Cleanest approach: have the sync function temporarily set a session GUC (e.g. `SET LOCAL app.system_write = 'on'`) and update the tampering trigger to allow `display_name` changes when that GUC is set.

Updated tampering trigger snippet:

```sql
IF current_setting('app.system_write', true) = 'on' THEN
  RETURN NEW;
END IF;
```

### 2. Backfill

One-time update so existing memberships immediately reflect current profile names:

```sql
SET LOCAL app.system_write = 'on';
UPDATE public.league_members lm
SET display_name = p.display_name
FROM public.profiles p
WHERE p.user_id = lm.user_id
  AND p.display_name IS NOT NULL
  AND length(trim(p.display_name)) > 0
  AND p.display_name <> lm.display_name;
```

### 3. No frontend changes required

`ProfilePage` already updates `profiles.display_name` on blur. `LeaguePage` reads from `league_members` and will now reflect updates after the trigger fires.

## Out of scope

Refactoring to drop `league_members.display_name` and join to `profiles` at read time (would require a new RPC/view because `profiles` SELECT policy restricts to `auth.uid() = user_id`).
