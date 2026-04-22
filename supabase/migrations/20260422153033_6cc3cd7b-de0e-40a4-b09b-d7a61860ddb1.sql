drop function if exists public.find_league_by_code(text);

create or replace function public.find_league_by_code(_code text)
returns table (id uuid, name text, join_code text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, join_code from public.leagues where join_code = _code limit 1;
$$;

grant execute on function public.find_league_by_code(text) to authenticated;