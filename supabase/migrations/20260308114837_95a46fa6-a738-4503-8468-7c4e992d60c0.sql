
-- 1. DELETE on axes_developpement (owner + coparent)
CREATE POLICY "membres_delete_axes" ON public.axes_developpement
  FOR DELETE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

-- 2. UPDATE on enfant_membres (owner only)
CREATE POLICY "owner_update_enfant_membres" ON public.enfant_membres
  FOR UPDATE TO authenticated
  USING (get_membre_role(enfant_id) = 'owner'::text);

-- 3. DELETE on enfant_membres (owner only)
CREATE POLICY "owner_delete_enfant_membres" ON public.enfant_membres
  FOR DELETE TO authenticated
  USING (get_membre_role(enfant_id) = 'owner'::text);
