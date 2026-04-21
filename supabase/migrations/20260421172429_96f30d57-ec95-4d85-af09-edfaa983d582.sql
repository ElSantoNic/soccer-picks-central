
-- 1. picks table
CREATE TABLE public.picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  jornada_id uuid NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  pick text NOT NULL,
  is_correct boolean,
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

CREATE INDEX idx_picks_user_jornada ON public.picks(user_id, jornada_id);
CREATE INDEX idx_picks_match ON public.picks(match_id);

-- updated_at trigger
CREATE TRIGGER trg_picks_updated_at
BEFORE UPDATE ON public.picks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Validate pick value + jornada-not-started lock
CREATE OR REPLACE FUNCTION public.validate_pick()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  first_kickoff timestamptz;
BEGIN
  IF NEW.pick NOT IN ('1', 'X', '2') THEN
    RAISE EXCEPTION 'pick must be 1, X, or 2';
  END IF;

  SELECT MIN(kickoff_utc) INTO first_kickoff
  FROM public.matches
  WHERE jornada_id = NEW.jornada_id;

  IF first_kickoff IS NOT NULL AND first_kickoff <= now() THEN
    RAISE EXCEPTION 'jornada is locked: first kickoff has passed';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_picks_validate
BEFORE INSERT OR UPDATE ON public.picks
FOR EACH ROW EXECUTE FUNCTION public.validate_pick();

-- 3. RLS
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own picks"
ON public.picks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own picks"
ON public.picks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own picks"
ON public.picks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Scoring: on match result change, grade picks + recompute league_members totals
CREATE OR REPLACE FUNCTION public.score_match_results()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  open_jornada_id uuid;
  affected_user uuid;
BEGIN
  -- Only run when result_1x2 actually changed and is set
  IF NEW.result_1x2 IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.result_1x2 IS NOT DISTINCT FROM NEW.result_1x2 THEN
    RETURN NEW;
  END IF;

  IF NEW.result_1x2 NOT IN ('1', 'X', '2') THEN
    RETURN NEW;
  END IF;

  -- Grade every pick for this match
  UPDATE public.picks
  SET
    is_correct = (pick = NEW.result_1x2),
    points_awarded = CASE WHEN pick = NEW.result_1x2 THEN 3 ELSE 0 END
  WHERE match_id = NEW.id;

  -- Find currently open jornada (for points_jornada)
  SELECT id INTO open_jornada_id
  FROM public.jornadas
  WHERE status = 'open'
  ORDER BY jornada_number DESC
  LIMIT 1;

  -- Recompute totals for every league member whose user has a pick on this match
  FOR affected_user IN
    SELECT DISTINCT user_id FROM public.picks WHERE match_id = NEW.id
  LOOP
    UPDATE public.league_members lm
    SET
      points_total = COALESCE((
        SELECT SUM(points_awarded) FROM public.picks WHERE user_id = affected_user
      ), 0),
      points_jornada = COALESCE((
        SELECT SUM(points_awarded) FROM public.picks
        WHERE user_id = affected_user
          AND jornada_id = open_jornada_id
      ), 0)
    WHERE lm.user_id = affected_user;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_matches_score
AFTER UPDATE OF result_1x2 ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.score_match_results();
