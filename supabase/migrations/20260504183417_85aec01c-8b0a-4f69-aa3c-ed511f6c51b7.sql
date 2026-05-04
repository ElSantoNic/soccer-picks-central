
CREATE OR REPLACE FUNCTION public.get_member_picks(
  _league_id uuid,
  _user_id uuid,
  _jornada_id uuid
)
RETURNS TABLE(match_id uuid, pick text, is_correct boolean, points_awarded integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
  jornada_status text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  -- Caller must be a member of the league (or its creator).
  IF NOT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = _league_id AND user_id = caller
  ) AND NOT EXISTS (
    SELECT 1 FROM public.leagues
    WHERE id = _league_id AND created_by = caller
  ) THEN
    RAISE EXCEPTION 'not a league member';
  END IF;

  -- Target user must be a member of the league.
  IF NOT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = _league_id AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'target user is not a league member';
  END IF;

  -- If viewing someone else's picks, jornada must be locked or complete.
  IF _user_id <> caller THEN
    SELECT j.status INTO jornada_status
    FROM public.jornadas j WHERE j.id = _jornada_id;

    IF jornada_status IS NULL OR jornada_status NOT IN ('locked', 'complete') THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT p.match_id, p.pick, p.is_correct, p.points_awarded
  FROM public.picks p
  WHERE p.user_id = _user_id AND p.jornada_id = _jornada_id;
END;
$$;
