-- 1. Update tampering-prevention trigger to allow system writes via GUC
CREATE OR REPLACE FUNCTION public.prevent_league_member_points_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow elevated/system contexts (no JWT) to modify anything (scoring trigger)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow trusted system writes that opt in via session GUC (e.g. profile name sync)
  IF current_setting('app.system_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

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

-- 2. Sync function: propagate profiles.display_name -> league_members.display_name
CREATE OR REPLACE FUNCTION public.sync_league_member_display_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name
     AND NEW.display_name IS NOT NULL
     AND length(trim(NEW.display_name)) > 0 THEN
    PERFORM set_config('app.system_write', 'on', true);
    UPDATE public.league_members
    SET display_name = NEW.display_name
    WHERE user_id = NEW.user_id
      AND display_name IS DISTINCT FROM NEW.display_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_league_member_display_name ON public.profiles;
CREATE TRIGGER profiles_sync_league_member_display_name
AFTER UPDATE OF display_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_league_member_display_name();

-- 3. Backfill existing memberships
DO $$
BEGIN
  PERFORM set_config('app.system_write', 'on', true);
  UPDATE public.league_members lm
  SET display_name = p.display_name
  FROM public.profiles p
  WHERE p.user_id = lm.user_id
    AND p.display_name IS NOT NULL
    AND length(trim(p.display_name)) > 0
    AND p.display_name <> lm.display_name;
END $$;