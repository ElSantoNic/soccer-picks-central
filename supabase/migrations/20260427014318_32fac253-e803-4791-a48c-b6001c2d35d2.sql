
-- 1. Restrict profiles INSERT/UPDATE to authenticated users only
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Prevent users from self-awarding points/badges via league_members UPDATE.
-- Replace the broad update policy with a trigger that locks privileged columns.
CREATE OR REPLACE FUNCTION public.prevent_league_member_points_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow elevated/system contexts (no JWT) to modify anything (scoring trigger)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Block changes to scoring/identity fields by the row owner
  IF NEW.points_jornada IS DISTINCT FROM OLD.points_jornada
     OR NEW.points_total IS DISTINCT FROM OLD.points_total
     OR NEW.badges IS DISTINCT FROM OLD.badges
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.league_id IS DISTINCT FROM OLD.league_id
     OR NEW.display_name IS DISTINCT FROM OLD.display_name
  THEN
    RAISE EXCEPTION 'Not allowed to modify points, badges, or membership identity fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_members_lock_points ON public.league_members;
CREATE TRIGGER league_members_lock_points
BEFORE UPDATE ON public.league_members
FOR EACH ROW
EXECUTE FUNCTION public.prevent_league_member_points_tampering();
