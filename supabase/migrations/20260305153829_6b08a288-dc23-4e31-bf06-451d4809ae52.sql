
ALTER TABLE public.enfants
  ADD COLUMN IF NOT EXISTS mdph_type_demande text,
  ADD COLUMN IF NOT EXISTS mdph_derniere_demande date;

CREATE OR REPLACE FUNCTION public.validate_enfant_mdph_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.mdph_type_demande IS NOT NULL
     AND NEW.mdph_type_demande NOT IN ('premiere_demande','renouvellement') THEN
    RAISE EXCEPTION 'Invalid mdph_type_demande: %', NEW.mdph_type_demande;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_enfant_mdph_type
  BEFORE INSERT OR UPDATE ON public.enfants
  FOR EACH ROW EXECUTE FUNCTION public.validate_enfant_mdph_type();
