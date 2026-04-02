
-- Master team list
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT NOT NULL,
  color TEXT DEFAULT '#666666',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Jornadas
CREATE TABLE public.jornadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season TEXT NOT NULL DEFAULT 'Clausura 2026',
  jornada_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'complete')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (season, jornada_number)
);

-- Matches
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  match_id_csv TEXT UNIQUE,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  kickoff_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  result_1x2 TEXT CHECK (result_1x2 IN ('1', 'X', '2')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public read on jornadas and matches (picks page needs this)
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read jornadas" ON public.jornadas FOR SELECT USING (true);
CREATE POLICY "Anyone can read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Anyone can read teams" ON public.teams FOR SELECT USING (true);

-- Admin insert/update policies (service role bypasses RLS, so these are for authenticated admin)
CREATE POLICY "Service role can manage jornadas" ON public.jornadas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage matches" ON public.matches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

-- Seed Liga MX teams
INSERT INTO public.teams (name, short_name, color) VALUES
  ('América', 'AME', '#FFD700'),
  ('Guadalajara', 'GDL', '#CD2E3A'),
  ('Cruz Azul', 'CAZ', '#0047AB'),
  ('Pumas UNAM', 'PUM', '#003366'),
  ('Tigres UANL', 'TIG', '#FFB800'),
  ('Monterrey', 'MTY', '#003DA5'),
  ('Santos Laguna', 'SAN', '#00843D'),
  ('León', 'LEO', '#008C45'),
  ('Toluca', 'TOL', '#8B0000'),
  ('Atlas', 'ATL', '#C8102E'),
  ('Pachuca', 'PAC', '#003B7B'),
  ('Necaxa', 'NEC', '#E8112D'),
  ('Puebla', 'PUE', '#2B4C96'),
  ('Querétaro', 'QRO', '#00205B'),
  ('Mazatlán', 'MAZ', '#6B2D8B'),
  ('Tijuana', 'TIJ', '#C8102E'),
  ('San Luis', 'SLU', '#C41E3A'),
  ('Juárez', 'JUA', '#006B3F');
