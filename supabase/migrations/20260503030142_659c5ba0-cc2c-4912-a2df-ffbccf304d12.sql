ALTER TABLE public.jornadas
  ADD COLUMN stage text NOT NULL DEFAULT 'regular',
  ADD COLUMN leg text NOT NULL DEFAULT 'single';

ALTER TABLE public.jornadas
  ADD CONSTRAINT jornadas_stage_check CHECK (stage IN ('regular','cuartos','semifinal','final')),
  ADD CONSTRAINT jornadas_leg_check CHECK (leg IN ('single','ida','vuelta'));