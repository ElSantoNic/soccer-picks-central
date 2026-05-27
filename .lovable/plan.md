# Switch scoring to 1 point per correct pick

## Root cause

The `score_match_results` trigger in the database awards 3 points per correct pick:

```sql
points_awarded = CASE WHEN pick = NEW.result_1x2 THEN 3 ELSE 0 END
```

The FAQ copy (`about.faqs` in `src/i18n/locales/en.json` / `es.json`) and the PRD both specify 1 point per correct pick. The trigger was written with football-style "3 points for a win" intuition rather than standard quiniela scoring, so the database drifted from the spec. No frontend code hardcodes the multiplier — every points display reads `picks.points_awarded` / `league_members.points_total` / `league_members.points_jornada` directly, so a single trigger change plus a backfill is enough.

## Changes

### 1. Migration — update the scoring trigger

Replace `score_match_results` so a correct pick awards `1` instead of `3`. Keep everything else identical (the `app.system_write` GUC handling, the league_members recomputation loop, the early-exit guards).

```sql
CREATE OR REPLACE FUNCTION public.score_match_results()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  open_jornada_id uuid;
  affected_user uuid;
BEGIN
  IF NEW.result_1x2 IS NULL THEN RETURN NEW; END IF;
  IF OLD.result_1x2 IS NOT DISTINCT FROM NEW.result_1x2 THEN RETURN NEW; END IF;
  IF NEW.result_1x2 NOT IN ('1', 'X', '2') THEN RETURN NEW; END IF;

  PERFORM set_config('app.system_write', 'on', true);

  UPDATE public.picks
  SET is_correct = (pick = NEW.result_1x2),
      points_awarded = CASE WHEN pick = NEW.result_1x2 THEN 1 ELSE 0 END
  WHERE match_id = NEW.id;

  SELECT id INTO open_jornada_id
  FROM public.jornadas WHERE status = 'open'
  ORDER BY jornada_number DESC LIMIT 1;

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
$$;
```

### 2. Migration — backfill existing rows

All previously scored picks have `points_awarded = 3` for correct ones. In the same migration, rewrite them and recompute `league_members` totals. Use the `app.system_write` GUC so the tamper-prevention triggers (`prevent_pick_score_tampering`, `prevent_league_member_points_tampering`) allow the bulk update.

```sql
DO $$
DECLARE
  open_jornada_id uuid;
BEGIN
  PERFORM set_config('app.system_write', 'on', true);

  UPDATE public.picks
  SET points_awarded = CASE WHEN is_correct = true THEN 1 ELSE 0 END
  WHERE is_correct IS NOT NULL;

  SELECT id INTO open_jornada_id
  FROM public.jornadas WHERE status = 'open'
  ORDER BY jornada_number DESC LIMIT 1;

  UPDATE public.league_members lm
  SET points_total = COALESCE((
        SELECT SUM(points_awarded) FROM public.picks WHERE user_id = lm.user_id
      ), 0),
      points_jornada = CASE
        WHEN open_jornada_id IS NULL THEN 0
        ELSE COALESCE((
          SELECT SUM(points_awarded) FROM public.picks
          WHERE user_id = lm.user_id AND jornada_id = open_jornada_id
        ), 0)
      END
  WHERE lm.user_id IS NOT NULL;
END $$;
```

## Out of scope

- No FAQ/i18n changes — the copy already says "1 point".
- No frontend changes — all UIs read scoring columns directly, no hardcoded 3× multiplier anywhere.
- No change to the tamper-prevention triggers or audit behavior.
- No change to leaderboards' tie-break logic (none exists today; ties stay ties).

## Verification after apply

1. Spot-check `picks` where `is_correct = true` — every row should now have `points_awarded = 1`.
2. Spot-check a few `league_members` rows — `points_total` should equal the user's count of correct picks.
3. Confirm the next match-result update writes `1` (not `3`) via the trigger.
