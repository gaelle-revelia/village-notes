
-- Phase 4: RLS rewrite on memos
DROP POLICY IF EXISTS "users_own_memos" ON public.memos;

CREATE POLICY "membres_select_memos" ON public.memos
  FOR SELECT TO authenticated
  USING (public.get_membre_role(enfant_id) IS NOT NULL);

CREATE POLICY "membres_insert_memos" ON public.memos
  FOR INSERT TO authenticated
  WITH CHECK (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "membres_update_memos" ON public.memos
  FOR UPDATE TO authenticated
  USING (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "membres_delete_memos" ON public.memos
  FOR DELETE TO authenticated
  USING (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));

-- Phase 5: RLS rewrite on intervenants
DROP POLICY IF EXISTS "users_own_intervenants" ON public.intervenants;

CREATE POLICY "membres_select_intervenants" ON public.intervenants
  FOR SELECT TO authenticated
  USING (public.get_membre_role(enfant_id) IS NOT NULL);

CREATE POLICY "membres_insert_intervenants" ON public.intervenants
  FOR INSERT TO authenticated
  WITH CHECK (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "membres_update_intervenants" ON public.intervenants
  FOR UPDATE TO authenticated
  USING (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "membres_delete_intervenants" ON public.intervenants
  FOR DELETE TO authenticated
  USING (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));
