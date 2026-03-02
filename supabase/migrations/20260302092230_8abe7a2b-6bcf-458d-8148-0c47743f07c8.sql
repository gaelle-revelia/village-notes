CREATE TABLE public.enfant_lexique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id uuid NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  mot_transcrit text NOT NULL,
  mot_correct text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_enfant_lexique_enfant_id ON public.enfant_lexique(enfant_id);

ALTER TABLE public.enfant_lexique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read enfant lexique"
  ON public.enfant_lexique FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

CREATE POLICY "members can insert enfant lexique"
  ON public.enfant_lexique FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

CREATE POLICY "members can update enfant lexique"
  ON public.enfant_lexique FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

CREATE POLICY "members can delete enfant lexique"
  ON public.enfant_lexique FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));