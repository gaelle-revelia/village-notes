ALTER TABLE public.enfants
  ADD COLUMN IF NOT EXISTS has_medicaments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_soins boolean NOT NULL DEFAULT false;