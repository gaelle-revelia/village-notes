
CREATE TABLE public.specialties (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_normalized text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT specialties_name_normalized_key UNIQUE (name_normalized)
);

ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read specialties"
  ON public.specialties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert specialties"
  ON public.specialties FOR INSERT
  TO authenticated
  WITH CHECK (true);

INSERT INTO public.specialties (name, name_normalized, is_default) VALUES
  ('Kinésithérapeute', 'kinésithérapeute', true),
  ('Ergothérapeute', 'ergothérapeute', true),
  ('Psychomotricien', 'psychomotricien', true),
  ('Médecin MPR', 'médecin mpr', true),
  ('Orthophoniste', 'orthophoniste', true);
