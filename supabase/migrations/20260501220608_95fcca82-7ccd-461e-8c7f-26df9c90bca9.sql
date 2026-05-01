CREATE POLICY "League creators can remove members"
ON public.league_members
FOR DELETE
TO authenticated
USING (
  auth.uid() = (SELECT created_by FROM public.leagues WHERE id = league_members.league_id)
  AND user_id IS DISTINCT FROM (SELECT created_by FROM public.leagues WHERE id = league_members.league_id)
);