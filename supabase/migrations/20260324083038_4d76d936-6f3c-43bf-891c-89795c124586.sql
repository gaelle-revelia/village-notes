CREATE TABLE public.soins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enfant_id uuid NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  nom text NOT NULL,
  description text,
  frequence text,
  instructions text,
  materiel text,
  signes_alerte text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.soins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soins_select"
ON public.soins FOR SELECT TO authenticated
USING (get_membre_role(enfant_id) IN ('owner', 'coparent', 'famille'));

CREATE POLICY "soins_insert"
ON public.soins FOR INSERT TO authenticated
WITH CHECK (get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "soins_update"
ON public.soins FOR UPDATE TO authenticated
USING (get_membre_role(enfant_id) IN ('owner', 'coparent'))
WITH CHECK (get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "soins_delete"
ON public.soins FOR DELETE TO authenticated
USING (get_membre_role(enfant_id) IN ('owner', 'coparent'));