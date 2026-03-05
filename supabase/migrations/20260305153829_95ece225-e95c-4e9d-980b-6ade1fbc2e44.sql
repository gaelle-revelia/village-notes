
CREATE TABLE public.syntheses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id             uuid NOT NULL REFERENCES enfants(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL,
  cas_usage             text NOT NULL,
  periode_debut         date,
  periode_fin           date,
  contenu               text,
  etat_emotionnel       text,
  vocal_mdph            text,
  reponses_transmission jsonb,
  metadata              jsonb,
  created_at            timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_synthese_cas_usage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cas_usage NOT IN ('pick_me_up','mdph','rdv_briefing','rdv_presentation','transmission') THEN
    RAISE EXCEPTION 'Invalid cas_usage: %', NEW.cas_usage;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_synthese_cas_usage
  BEFORE INSERT OR UPDATE ON public.syntheses
  FOR EACH ROW EXECUTE FUNCTION public.validate_synthese_cas_usage();

ALTER TABLE public.syntheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syntheses_access" ON public.syntheses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enfant_membres
      WHERE enfant_membres.enfant_id = syntheses.enfant_id
        AND enfant_membres.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM enfant_membres
      WHERE enfant_membres.enfant_id = syntheses.enfant_id
        AND enfant_membres.user_id = auth.uid()
    )
  );
