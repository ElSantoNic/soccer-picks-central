-- 1) Restrict column access on leagues.join_code to creators only.
-- Revoke broad column SELECT, then re-grant SELECT on every other column.
REVOKE SELECT ON TABLE public.leagues FROM anon, authenticated;

GRANT SELECT (id, name, description, created_by, created_at)
  ON public.leagues TO anon, authenticated;

-- Note: join_code column is intentionally NOT granted to anon/authenticated.
-- Creators retrieve it via the SECURITY DEFINER function below.

-- 2) Function for the creator to fetch their league's join_code.
CREATE OR REPLACE FUNCTION public.get_league_join_code(_league_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT join_code
  FROM public.leagues
  WHERE id = _league_id
    AND created_by = auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_league_join_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_league_join_code(uuid) TO authenticated;

-- 3) Lock down find_league_by_code: must be authenticated only.
REVOKE EXECUTE ON FUNCTION public.find_league_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_league_by_code(text) TO authenticated;
