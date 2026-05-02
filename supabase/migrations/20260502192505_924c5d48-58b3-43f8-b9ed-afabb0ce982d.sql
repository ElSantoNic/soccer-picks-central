CREATE OR REPLACE FUNCTION public.score_match_results()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  open_jornada_id uuid;
  affected_user uuid;
BEGIN
  IF NEW.result_1x2 IS NULL THEN RETURN NEW; END IF;
  IF OLD.result_1x2 IS NOT DISTINCT FROM NEW.result_1x2 THEN RETURN NEW; END IF;
  IF NEW.result_1x2 NOT IN ('1', 'X', '2') THEN RETURN NEW; END IF;

  UPDATE public.picks
  SET is_correct = (pick = NEW.result_1x2),
      points_awarded = CASE WHEN pick = NEW.result_1x2 THEN 3 ELSE 0 END
  WHERE match_id = NEW.id;

  SELECT id INTO open_jornada_id
  FROM public.jornadas WHERE status = 'open'
  ORDER BY jornada_number DESC LIMIT 1;

  PERFORM set_config('app.system_write', 'on', true);

  FOR affected_user IN
    SELECT DISTINCT user_id FROM public.picks WHERE match_id = NEW.id
  LOOP
    UPDATE public.league_members lm
    SET points_total = COALESCE((SELECT SUM(points_awarded) FROM public.picks WHERE user_id = affected_user), 0),
        points_jornada = COALESCE((SELECT SUM(points_awarded) FROM public.picks
                                   WHERE user_id = affected_user AND jornada_id = open_jornada_id), 0)
    WHERE lm.user_id = affected_user;
  END LOOP;

  RETURN NEW;
END;
$function$;