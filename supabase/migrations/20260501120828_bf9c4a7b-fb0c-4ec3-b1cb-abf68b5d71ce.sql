-- Fix: Pick submission lock bypass via mismatched jornada_id.
-- Ensure the match actually belongs to the submitted jornada, then keep
-- the existing kickoff lock check using the match's true jornada.
CREATE OR REPLACE FUNCTION public.validate_pick()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  first_kickoff timestamptz;
  match_jornada uuid;
BEGIN
  IF NEW.pick NOT IN ('1', 'X', '2') THEN
    RAISE EXCEPTION 'pick must be 1, X, or 2';
  END IF;

  -- Verify the match belongs to the stated jornada.
  SELECT jornada_id INTO match_jornada
  FROM public.matches
  WHERE id = NEW.match_id;

  IF match_jornada IS NULL THEN
    RAISE EXCEPTION 'match not found';
  END IF;

  IF match_jornada IS DISTINCT FROM NEW.jornada_id THEN
    RAISE EXCEPTION 'match does not belong to the specified jornada';
  END IF;

  -- On UPDATE, if the user's selection hasn't changed, this is a scoring/system
  -- write (is_correct, points_awarded) — skip the jornada lock check.
  IF TG_OP = 'UPDATE' AND NEW.pick = OLD.pick THEN
    RETURN NEW;
  END IF;

  -- Use the match's actual jornada for the kickoff lock check (defense in depth).
  SELECT MIN(kickoff_utc) INTO first_kickoff
  FROM public.matches
  WHERE jornada_id = match_jornada;

  IF first_kickoff IS NOT NULL AND first_kickoff <= now() THEN
    RAISE EXCEPTION 'jornada is locked: first kickoff has passed';
  END IF;

  RETURN NEW;
END;
$function$;