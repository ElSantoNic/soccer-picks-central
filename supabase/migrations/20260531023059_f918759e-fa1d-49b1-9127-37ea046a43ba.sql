
-- 1) Fix league_members SELECT policy: restrict to leagues the user belongs to or created
DROP POLICY IF EXISTS "Authenticated users can read league members" ON public.league_members;

CREATE POLICY "Members and creators can read league members"
ON public.league_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.league_members lm
    WHERE lm.league_id = league_members.league_id
      AND lm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.leagues l
    WHERE l.id = league_members.league_id
      AND l.created_by = auth.uid()
  )
);

-- 2) Revoke EXECUTE from anon and public on SECURITY DEFINER helper functions
--    (triggers still run; only direct RPC exposure is removed)
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_league_join_code(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.find_league_by_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_member_picks(uuid, uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_owned_leagues_blocking_deletion() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.transfer_league_ownership(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_league(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_league_jornada_points(uuid, uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_league_join_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_league_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_picks(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owned_leagues_blocking_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_league_ownership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_league(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_league_jornada_points(uuid, uuid) TO authenticated;
