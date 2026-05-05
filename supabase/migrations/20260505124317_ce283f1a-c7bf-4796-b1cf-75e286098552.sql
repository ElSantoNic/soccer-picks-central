
-- 1. List owned leagues blocking account deletion
CREATE OR REPLACE FUNCTION public.get_owned_leagues_blocking_deletion()
RETURNS TABLE(league_id uuid, name text, member_count integer, can_solo_delete boolean)
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

  RETURN QUERY
  SELECT
    l.id AS league_id,
    l.name,
    COALESCE(mc.cnt, 0)::int AS member_count,
    (COALESCE(mc.other_cnt, 0) = 0) AS can_solo_delete
  FROM public.leagues l
  LEFT JOIN (
    SELECT
      league_id,
      COUNT(*)::int AS cnt,
      COUNT(*) FILTER (WHERE user_id IS DISTINCT FROM caller)::int AS other_cnt
    FROM public.league_members
    GROUP BY league_id
  ) mc ON mc.league_id = l.id
  WHERE l.created_by = caller;
END;
$$;

-- 2. Transfer ownership
CREATE OR REPLACE FUNCTION public.transfer_league_ownership(_league_id uuid, _new_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.leagues WHERE id = _league_id AND created_by = caller
  ) THEN
    RAISE EXCEPTION 'only the league creator can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = _league_id AND user_id = _new_owner
  ) THEN
    RAISE EXCEPTION 'new owner must be a member of the league';
  END IF;

  UPDATE public.leagues SET created_by = _new_owner WHERE id = _league_id;
END;
$$;

-- 3. Delete league (creator only)
CREATE OR REPLACE FUNCTION public.delete_league(_league_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.leagues WHERE id = _league_id AND created_by = caller
  ) THEN
    RAISE EXCEPTION 'only the league creator can delete the league';
  END IF;

  DELETE FROM public.league_members WHERE league_id = _league_id;
  DELETE FROM public.leagues WHERE id = _league_id;
END;
$$;

-- 4. Defense-in-depth DELETE policy for leagues
CREATE POLICY "Creators can delete their leagues"
ON public.leagues
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);
