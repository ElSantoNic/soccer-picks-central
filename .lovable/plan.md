## Goal
Prevent authenticated users from tampering with `picks.is_correct` and `picks.points_awarded` via direct PostgREST UPDATEs, while allowing the existing scoring trigger (`score_match_results`) to continue writing those fields.

## Approach
Add a `BEFORE UPDATE` trigger on `public.picks` that mirrors the pattern already used by `prevent_league_member_points_tampering` on `league_members`:

- If `auth.uid() IS NULL` → system/trigger context → allow.
- If `current_setting('app.system_write', true) = 'on'` → allow (future-proof, matches existing convention).
- Otherwise, force `NEW.is_correct := OLD.is_correct` and `NEW.points_awarded := OLD.points_awarded` so user UPDATEs silently cannot change scoring columns (they can still change `pick` itself, subject to the existing `validate_pick` kickoff lock).

This is preferable to revoking column grants because it keeps the single existing UPDATE policy intact and matches the codebase's established convention.

## Migration

```sql
CREATE OR REPLACE FUNCTION public.prevent_pick_score_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow elevated/system contexts (scoring trigger runs with auth.uid() IS NULL)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Allow trusted system writes that opt in via session GUC
  IF current_setting('app.system_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Authenticated users cannot modify scoring columns
  NEW.is_correct     := OLD.is_correct;
  NEW.points_awarded := OLD.points_awarded;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_pick_score_tampering
BEFORE UPDATE ON public.picks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_pick_score_tampering();
```

## Verification
- User UPDATE setting `points_awarded = 100` → row keeps original `points_awarded` (0 until scored).
- Admin posts a match result → `score_match_results` trigger runs with `auth.uid()` still set to the admin, BUT it writes directly via `UPDATE public.picks SET is_correct=..., points_awarded=...` inside a `SECURITY DEFINER` function. Since `auth.uid()` is not null for admins, we need the GUC bypass. Update `score_match_results` to call `PERFORM set_config('app.system_write', 'on', true);` before its `UPDATE public.picks` (it already uses this pattern for league_members later in the same function — we just need to move/duplicate it before the picks update).

### Updated `score_match_results` (only the ordering changes)
Add `PERFORM set_config('app.system_write', 'on', true);` as the first statement after the early returns, so both the `picks` update and the `league_members` update are covered.

## Files
- New migration creating `prevent_pick_score_tampering()` + trigger, and replacing `score_match_results()` with the GUC set earlier in the function body.

No frontend changes required.
