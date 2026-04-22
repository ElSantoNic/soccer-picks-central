

## Fix: results upload blocked by pick-lock trigger

### What's broken

When you upload results, the admin code runs `UPDATE matches SET result_1x2 = ...`. That fires my `score_match_results` trigger, which writes `is_correct` and `points_awarded` onto every `picks` row for that match. Those pick writes hit my `validate_pick` trigger, which checks "has the first kickoff passed?" — yes, it has (the matches just finished) — so it rejects with "jornada is locked." The scoring update is being treated as if a user is trying to change a pick.

Net effect: results can never be uploaded after kickoff, which is exactly when you need to upload them.

### Fix (one migration)

Update `validate_pick()` so it only blocks **the columns users actually pick with** (the `pick` text), not internal scoring fields (`is_correct`, `points_awarded`). New logic:

- On INSERT: keep current behavior (still validates `pick` value + jornada lock).
- On UPDATE: if `NEW.pick = OLD.pick` (user didn't change their selection — this is a scoring write), skip the lock check entirely. Only enforce the lock when `NEW.pick` differs from `OLD.pick`.

This preserves the user-facing rule ("can't change picks after first kickoff") while letting the scoring trigger do its job.

### Verification after deploy

1. Re-upload last night's results CSV → should succeed with N rows updated, 0 errors.
2. Check `picks` rows for those matches → `is_correct` and `points_awarded` populated.
3. Check `league_members.points_total` / `points_jornada` → updated for affected users.
4. Sanity: try changing a saved pick from a logged-in user account on a locked jornada → should still be rejected with "jornada is locked."

### Files touched

- New migration: redefine `public.validate_pick()` with the INSERT vs. UPDATE branch above. No table or RLS changes.
- No frontend changes needed.

