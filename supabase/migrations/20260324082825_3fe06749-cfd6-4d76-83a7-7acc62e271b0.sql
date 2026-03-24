CREATE TABLE public.medicaments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enfant_id uuid NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  nom text NOT NULL,
  dosage text,
  frequence text,
  voie text,
  instructions text,
  conditions text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.medicaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medicaments_select"
ON public.medicaments FOR SELECT TO authenticated
USING (get_membre_role(enfant_id) IN ('owner', 'coparent', 'famille'));

CREATE POLICY "medicaments_insert"
ON public.medicaments FOR INSERT TO authenticated
WITH CHECK (get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "medicaments_update"
ON public.medicaments FOR UPDATE TO authenticated
USING (get_membre_role(enfant_id) IN ('owner', 'coparent'))
WITH CHECK (get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "medicaments_delete"
ON public.medicaments FOR DELETE TO authenticated
USING (get_membre_role(enfant_id) IN ('owner', 'coparent'));