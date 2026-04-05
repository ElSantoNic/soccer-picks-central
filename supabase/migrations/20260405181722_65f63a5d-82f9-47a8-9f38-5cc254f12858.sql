
-- LEAGUES: restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can read leagues" ON public.leagues;
CREATE POLICY "Authenticated users can read leagues" ON public.leagues FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can create leagues" ON public.leagues;
CREATE POLICY "Authenticated users can create leagues" ON public.leagues FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Anyone can update leagues" ON public.leagues;
CREATE POLICY "Creators can update their leagues" ON public.leagues FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- LEAGUE_MEMBERS: restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can read league members" ON public.league_members;
CREATE POLICY "Authenticated users can read league members" ON public.league_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can join leagues" ON public.league_members;
CREATE POLICY "Authenticated users can join leagues" ON public.league_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can update league members" ON public.league_members;
CREATE POLICY "Users can update their own membership" ON public.league_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- PROFILES: restrict to authenticated users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
