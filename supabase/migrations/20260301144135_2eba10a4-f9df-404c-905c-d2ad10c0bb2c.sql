
-- Supprimer l'ancienne politique restrictive
DROP POLICY "users_own_enfants" ON public.enfants;

-- Politique 1 : le proprietaire peut tout faire (PERMISSIVE par défaut)
CREATE POLICY "owner_all_enfants"
ON public.enfants
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Politique 2 : les membres peuvent lire (PERMISSIVE par défaut)
CREATE POLICY "membres_select_enfants"
ON public.enfants
FOR SELECT
TO authenticated
USING (get_membre_role(id) IS NOT NULL);
