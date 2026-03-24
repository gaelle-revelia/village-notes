
CREATE OR REPLACE FUNCTION public.validate_enfant_mdph_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.mdph_type_demande IS NOT NULL
     AND NEW.mdph_type_demande NOT IN ('premiere_demande','renouvellement','evolution') THEN
    RAISE EXCEPTION 'Invalid mdph_type_demande: %', NEW.mdph_type_demande;
  END IF;
  RETURN NEW;
END;
$function$;
