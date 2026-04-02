
-- Leagues table
CREATE TABLE public.leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  join_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Anyone can create leagues" ON public.leagues FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update leagues" ON public.leagues FOR UPDATE USING (true);

-- League members table
CREATE TABLE public.league_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '⚽',
  points_jornada INTEGER NOT NULL DEFAULT 0,
  points_total INTEGER NOT NULL DEFAULT 0,
  badges TEXT[] NOT NULL DEFAULT '{}',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(league_id, user_id)
);

ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read league members" ON public.league_members FOR SELECT USING (true);
CREATE POLICY "Anyone can join leagues" ON public.league_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update league members" ON public.league_members FOR UPDATE USING (true);
