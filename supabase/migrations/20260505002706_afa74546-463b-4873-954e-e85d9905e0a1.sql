CREATE OR REPLACE FUNCTION public.get_league_jornada_points(_league_id uuid, _jornada_id uuid)
RETURNS TABLE(user_id uuid, points integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = _league_id AND user_id = caller
  ) AND NOT EXISTS (
    SELECT 1 FROM public.leagues
    WHERE id = _league_id AND created_by = caller
  ) THEN
    RAISE EXCEPTION 'not a league member';
  END IF;

  RETURN QUERY
  SELECT lm.user_id, COALESCE(SUM(p.points_awarded), 0)::integer AS points
  FROM public.league_members lm
  LEFT JOIN public.picks p
    ON p.user_id = lm.user_id AND p.jornada_id = _jornada_id
  WHERE lm.league_id = _league_id AND lm.user_id IS NOT NULL
  GROUP BY lm.user_id;
END;
$$;