## Problem

Creating a league returns 500. Postgres logs show:

> `infinite recursion detected in policy for relation "league_members"`

This was introduced by the recent security migration that tightened the `league_members` SELECT policy. The new policy queries `league_members` from within its own `USING` expression:

```sql
USING (
  EXISTS (SELECT 1 FROM league_members lm WHERE lm.league_id = league_members.league_id AND lm.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM leagues l WHERE l.id = league_members.league_id AND l.created_by = auth.uid())
)
```

Self-referencing a table inside its own RLS policy triggers infinite recursion. The `leagues` SELECT policy has the same shape and will recurse the moment league_members RLS evaluates against it.

The creation flow fails on the `league_members` INSERT (whose `RETURNING`/visibility check evaluates SELECT RLS), surfacing the 500.

## Fix

Migration that introduces a `SECURITY DEFINER` helper to bypass RLS for the membership check, then rewrites both policies to use it.

```sql
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

-- league_members: replace recursive policy
DROP POLICY "Members and creators can read league members" ON public.league_members;
CREATE POLICY "Members and creators can read league members"
ON public.league_members FOR SELECT TO authenticated
USING (
  public.is_league_member(league_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.leagues l WHERE l.id = league_id AND l.created_by = auth.uid())
);

-- leagues: replace policy that also recurses through league_members RLS
DROP POLICY "Members and creators can read leagues" ON public.leagues;
CREATE POLICY "Members and creators can read leagues"
ON public.leagues FOR SELECT TO authenticated
USING (
  auth.uid() = created_by
  OR public.is_league_member(id, auth.uid())
);
```

No frontend changes needed — `CreateLeaguePage.tsx` already passes the correct payload.

## Verification

- Create a league as an authenticated user → succeeds, member row inserted, redirected to share screen.
- Re-run security scan; confirm `league_members` access is still restricted to members + creator (`is_league_member` is `SECURITY DEFINER` but only returns a boolean for the caller's own check).
- Postgres logs: no more "infinite recursion" errors.
