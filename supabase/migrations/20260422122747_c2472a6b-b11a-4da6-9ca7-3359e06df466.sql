CREATE OR REPLACE FUNCTION public.validate_pick()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  first_kickoff timestamptz;
BEGIN
  IF NEW.pick NOT IN ('1', 'X', '2') THEN
    RAISE EXCEPTION 'pick must be 1, X, or 2';
  END IF;

  -- On UPDATE, if the user's selection hasn't changed, this is a scoring/system
  -- write (is_correct, points_awarded) — skip the jornada lock check.
  IF TG_OP = 'UPDATE' AND NEW.pick = OLD.pick THEN
    RETURN NEW;
  END IF;

  SELECT MIN(kickoff_utc) INTO first_kickoff
  FROM public.matches
  WHERE jornada_id = NEW.jornada_id;

  IF first_kickoff IS NOT NULL AND first_kickoff <= now() THEN
    RAISE EXCEPTION 'jornada is locked: first kickoff has passed';
  END IF;

  RETURN NEW;
END;
$function$;