CREATE OR REPLACE FUNCTION public.is_league_member(_league_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = _league_id AND user_id = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_league_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_league_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Members and creators can read league members" ON public.league_members;
CREATE POLICY "Members and creators can read league members"
ON public.league_members FOR SELECT TO authenticated
USING (
  public.is_league_member(league_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.leagues l WHERE l.id = league_id AND l.created_by = auth.uid())
);

DROP POLICY IF EXISTS "Members and creators can read leagues" ON public.leagues;
CREATE POLICY "Members and creators can read leagues"
ON public.leagues FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR public.is_league_member(id, auth.uid())
);