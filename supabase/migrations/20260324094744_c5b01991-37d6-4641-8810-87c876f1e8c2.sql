CREATE TABLE public.materiel (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enfant_id uuid NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  nom text NOT NULL,
  conseils text,
  date_reception date,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.materiel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "materiel_select"
ON public.materiel FOR SELECT TO authenticated
USING (get_membre_role(enfant_id) IN ('owner', 'coparent', 'famille'));

CREATE POLICY "materiel_insert"
ON public.materiel FOR INSERT TO authenticated
WITH CHECK (get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "materiel_update"
ON public.materiel FOR UPDATE TO authenticated
USING (get_membre_role(enfant_id) IN ('owner', 'coparent'))
WITH CHECK (get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "materiel_delete"
ON public.materiel FOR DELETE TO authenticated
USING (get_membre_role(enfant_id) IN ('owner', 'coparent'));