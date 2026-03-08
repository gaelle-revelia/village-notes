ALTER TABLE public.profiles
  ADD COLUMN consent_at timestamptz,
  ADD COLUMN consent_version text DEFAULT 'v1.0';