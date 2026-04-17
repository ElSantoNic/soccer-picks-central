
-- Drop overly permissive service role policies (which used 'public' role)
DROP POLICY IF EXISTS "Service role can manage jornadas" ON public.jornadas;
DROP POLICY IF EXISTS "Service role can manage matches" ON public.matches;
DROP POLICY IF EXISTS "Service role can manage teams" ON public.teams;

-- Jornadas: admin-only writes
CREATE POLICY "Admins can insert jornadas"
  ON public.jornadas FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update jornadas"
  ON public.jornadas FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete jornadas"
  ON public.jornadas FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Matches: admin-only writes
CREATE POLICY "Admins can insert matches"
  ON public.matches FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update matches"
  ON public.matches FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete matches"
  ON public.matches FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Teams: admin-only writes
CREATE POLICY "Admins can insert teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
