

## Fix "Código no encontrado" when joining a league

### Root cause

Two bugs in `src/pages/LeaguesListPage.tsx → handleJoin`:

1. **RLS hides the league during lookup.** The `leagues` SELECT policy only exposes rows to the creator or existing members. A user trying to *join* is neither, so `select('id').eq('join_code', '7661').single()` returns no row → the alert fires even though the league exists (verified in DB: id `666f1d24…`, code `7661`, name "tus amigos").
2. **No membership row is inserted.** Even if lookup succeeded, the handler only navigates — it never adds the user to `league_members`, so `/league/:id` would also be blocked by RLS.

### Fix

**A. Add a SECURITY DEFINER RPC for code-based lookup** (bypasses RLS safely, only returns id + name, never lists all leagues):

```sql
create or replace function public.find_league_by_code(_code text)
returns table (id uuid, name text)
language sql stable security definer set search_path = public
as $$
  select id, name from public.leagues where join_code = _code limit 1;
$$;
grant execute on function public.find_league_by_code(text) to authenticated;
```

**B. Update `handleJoin` in `src/pages/LeaguesListPage.tsx`** to:
1. Require auth — if `user` is null, redirect to `/auth`.
2. Call `supabase.rpc('find_league_by_code', { _code: joinCode.trim() })`.
3. If found, upsert into `league_members` (`league_id`, `user_id`, `display_name` from profile, default `avatar_emoji`) — ignore conflict if already a member.
4. Replace `alert()` with a `sonner` toast (`"Código no encontrado"` / `"¡Te uniste a {name}!"`).
5. Navigate to `/league/:id` only after successful membership.

**C. Also fix `fetchLeagues`** — it currently lists *all* leagues the user can read, but with RLS that's only ones they're in or created (which is correct). However it shows `join_code` to every member; that's fine for members. No change needed there.

### Files touched

- New migration: `find_league_by_code` RPC.
- `src/pages/LeaguesListPage.tsx` — rewrite `handleJoin` (auth check, RPC, insert into `league_members`, toast feedback).

### Out of scope

- League detail page RLS (already correct — you'll be a member after joining).
- Renaming the duplicate "Tus Amigos" / "tus amigos" leagues — let me know if you want one removed.

