# Fix: Results upload fails with "Not allowed to modify points, badges, or membership identity fields"

## Root cause

When an admin uploads results, `Results Upload` updates `matches.result_1x2`. This fires the `score_match_results` trigger (SECURITY DEFINER), which updates `league_members.points_total` and `points_jornada` for affected users.

However, the `prevent_league_member_points_tampering` trigger blocks any change to those columns unless:
- `auth.uid()` is NULL (system context), OR
- the session GUC `app.system_write` is `'on'`

Since the admin is authenticated, `auth.uid()` is not NULL, and the scoring trigger never sets the GUC — so every league_members update is rejected. That's exactly the 9 errors shown (one per user with picks on those matches).

## Fix

Update the `score_match_results` function to set `app.system_write='on'` (transaction-local) before the league_members UPDATE, mirroring the pattern already used in `sync_league_member_display_name`.

### Migration (single function replacement)

```sql
CREATE OR REPLACE FUNCTION public.score_match_results()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  open_jornada_id uuid;
  affected_user uuid;
BEGIN
  IF NEW.result_1x2 IS NULL THEN RETURN NEW; END IF;
  IF OLD.result_1x2 IS NOT DISTINCT FROM NEW.result_1x2 THEN RETURN NEW; END IF;
  IF NEW.result_1x2 NOT IN ('1', 'X', '2') THEN RETURN NEW; END IF;

  UPDATE public.picks
  SET is_correct = (pick = NEW.result_1x2),
      points_awarded = CASE WHEN pick = NEW.result_1x2 THEN 3 ELSE 0 END
  WHERE match_id = NEW.id;

  SELECT id INTO open_jornada_id
  FROM public.jornadas WHERE status = 'open'
  ORDER BY jornada_number DESC LIMIT 1;

  -- Authorize the system write so the tamper guard lets us through
  PERFORM set_config('app.system_write', 'on', true);

  FOR affected_user IN
    SELECT DISTINCT user_id FROM public.picks WHERE match_id = NEW.id
  LOOP
    UPDATE public.league_members lm
    SET points_total = COALESCE((SELECT SUM(points_awarded) FROM public.picks WHERE user_id = affected_user), 0),
        points_jornada = COALESCE((SELECT SUM(points_awarded) FROM public.picks
                                   WHERE user_id = affected_user AND jornada_id = open_jornada_id), 0)
    WHERE lm.user_id = affected_user;
  END LOOP;

  RETURN NEW;
END;
$function$;
```

## After the fix

Re-upload `match_results-2.csv` from the Admin → Results Upload tab. The 9 rows should update successfully and league standings will refresh.

No frontend or RLS changes needed.
