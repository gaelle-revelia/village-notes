ALTER TABLE public.intervenants
  ADD COLUMN type text NOT NULL DEFAULT 'pro',
  ADD COLUMN actif boolean NOT NULL DEFAULT true;