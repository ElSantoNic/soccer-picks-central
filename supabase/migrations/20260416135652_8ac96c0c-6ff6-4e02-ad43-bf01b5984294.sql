
-- Fix profiles: users can only view their own profile
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Fix leagues: only creators or members can see leagues
DROP POLICY IF EXISTS "Authenticated users can read leagues" ON public.leagues;
CREATE POLICY "Members and creators can read leagues"
  ON public.leagues FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.league_members
      WHERE league_members.league_id = leagues.id
      AND league_members.user_id = auth.uid()
    )
  );
