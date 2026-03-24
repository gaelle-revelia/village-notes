
ALTER TABLE public.syntheses
  ADD COLUMN IF NOT EXISTS etat text NOT NULL DEFAULT 'brouillon';

CREATE OR REPLACE FUNCTION public.validate_synthese_etat()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.etat NOT IN ('brouillon', 'finalisee') THEN
    RAISE EXCEPTION 'Invalid etat: %', NEW.etat;
  END IF;
  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_validate_synthese_etat'
  ) THEN
    CREATE TRIGGER trg_validate_synthese_etat
      BEFORE INSERT OR UPDATE ON public.syntheses
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_synthese_etat();
  END IF;
END;
$$;
