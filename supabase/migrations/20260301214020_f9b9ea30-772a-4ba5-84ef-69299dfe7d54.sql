
-- Table activites
CREATE TABLE public.activites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id uuid NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  nom text NOT NULL,
  domaine text NOT NULL,
  track_temps boolean DEFAULT true,
  track_distance boolean DEFAULT false,
  unite_distance text DEFAULT 'metres',
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.activites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membres_select_activites" ON public.activites FOR SELECT USING (get_membre_role(enfant_id) IS NOT NULL);
CREATE POLICY "membres_insert_activites" ON public.activites FOR INSERT WITH CHECK (get_membre_role(enfant_id) IN ('owner', 'coparent'));
CREATE POLICY "membres_update_activites" ON public.activites FOR UPDATE USING (get_membre_role(enfant_id) IN ('owner', 'coparent'));
CREATE POLICY "membres_delete_activites" ON public.activites FOR DELETE USING (get_membre_role(enfant_id) IN ('owner', 'coparent'));

-- Table sessions_activite
CREATE TABLE public.sessions_activite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activite_id uuid NOT NULL REFERENCES public.activites(id) ON DELETE CASCADE,
  enfant_id uuid NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  duree_secondes integer,
  distance numeric,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sessions_activite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membres_select_sessions" ON public.sessions_activite FOR SELECT USING (get_membre_role(enfant_id) IS NOT NULL);
CREATE POLICY "membres_insert_sessions" ON public.sessions_activite FOR INSERT WITH CHECK (get_membre_role(enfant_id) IN ('owner', 'coparent'));
CREATE POLICY "membres_update_sessions" ON public.sessions_activite FOR UPDATE USING (get_membre_role(enfant_id) IN ('owner', 'coparent'));
CREATE POLICY "membres_delete_sessions" ON public.sessions_activite FOR DELETE USING (get_membre_role(enfant_id) IN ('owner', 'coparent'));
