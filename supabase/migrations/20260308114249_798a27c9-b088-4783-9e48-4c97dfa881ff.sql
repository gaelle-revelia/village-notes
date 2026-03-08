
-- ============================================================
-- Bulk RLS hygiene: scope all policies TO authenticated
-- ============================================================

-- 1. activites (4 policies)
DROP POLICY IF EXISTS "membres_select_activites" ON public.activites;
CREATE POLICY "membres_select_activites" ON public.activites
  FOR SELECT TO authenticated
  USING (get_membre_role(enfant_id) IS NOT NULL);

DROP POLICY IF EXISTS "membres_insert_activites" ON public.activites;
CREATE POLICY "membres_insert_activites" ON public.activites
  FOR INSERT TO authenticated
  WITH CHECK (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

DROP POLICY IF EXISTS "membres_update_activites" ON public.activites;
CREATE POLICY "membres_update_activites" ON public.activites
  FOR UPDATE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

DROP POLICY IF EXISTS "membres_delete_activites" ON public.activites;
CREATE POLICY "membres_delete_activites" ON public.activites
  FOR DELETE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

-- 2. axes_developpement (3 policies)
DROP POLICY IF EXISTS "membres_select_axes" ON public.axes_developpement;
CREATE POLICY "membres_select_axes" ON public.axes_developpement
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM enfant_membres
    WHERE enfant_membres.enfant_id = axes_developpement.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "membres_insert_axes" ON public.axes_developpement;
CREATE POLICY "membres_insert_axes" ON public.axes_developpement
  FOR INSERT TO authenticated
  WITH CHECK (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

DROP POLICY IF EXISTS "membres_update_axes" ON public.axes_developpement;
CREATE POLICY "membres_update_axes" ON public.axes_developpement
  FOR UPDATE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

-- 3. enfant_lexique (4 policies)
DROP POLICY IF EXISTS "members can read enfant lexique" ON public.enfant_lexique;
CREATE POLICY "members can read enfant lexique" ON public.enfant_lexique
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "members can insert enfant lexique" ON public.enfant_lexique;
CREATE POLICY "members can insert enfant lexique" ON public.enfant_lexique
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "members can update enfant lexique" ON public.enfant_lexique;
CREATE POLICY "members can update enfant lexique" ON public.enfant_lexique
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "members can delete enfant lexique" ON public.enfant_lexique;
CREATE POLICY "members can delete enfant lexique" ON public.enfant_lexique
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

-- 4. enfant_membres (2 policies)
DROP POLICY IF EXISTS "users_select_own_membership" ON public.enfant_membres;
CREATE POLICY "users_select_own_membership" ON public.enfant_membres
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "restricted_insert_enfant_membres" ON public.enfant_membres;
CREATE POLICY "restricted_insert_enfant_membres" ON public.enfant_membres
  FOR INSERT TO authenticated
  WITH CHECK (
    ((EXISTS (
      SELECT 1 FROM enfants
      WHERE enfants.id = enfant_membres.enfant_id
      AND enfants.user_id = auth.uid()
    )) AND (role = 'owner'::text))
    OR
    ((get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]))
    AND (role = ANY (ARRAY['coparent'::text, 'famille'::text])))
  );

-- 5. enfants (2 policies)
DROP POLICY IF EXISTS "owner_all_enfants" ON public.enfants;
CREATE POLICY "owner_all_enfants" ON public.enfants
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "membres_select_enfants" ON public.enfants;
CREATE POLICY "membres_select_enfants" ON public.enfants
  FOR SELECT TO authenticated
  USING (get_membre_role(id) IS NOT NULL);

-- 6. intervenants (4 policies)
DROP POLICY IF EXISTS "membres_select_intervenants" ON public.intervenants;
CREATE POLICY "membres_select_intervenants" ON public.intervenants
  FOR SELECT TO authenticated
  USING (get_membre_role(enfant_id) IS NOT NULL);

DROP POLICY IF EXISTS "membres_insert_intervenants" ON public.intervenants;
CREATE POLICY "membres_insert_intervenants" ON public.intervenants
  FOR INSERT TO authenticated
  WITH CHECK (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

DROP POLICY IF EXISTS "membres_update_intervenants" ON public.intervenants;
CREATE POLICY "membres_update_intervenants" ON public.intervenants
  FOR UPDATE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

DROP POLICY IF EXISTS "membres_delete_intervenants" ON public.intervenants;
CREATE POLICY "membres_delete_intervenants" ON public.intervenants
  FOR DELETE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

-- 7. invitations (1 policy)
DROP POLICY IF EXISTS "owners_manage_invitations" ON public.invitations;
CREATE POLICY "owners_manage_invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- 8. memos (4 policies)
DROP POLICY IF EXISTS "membres_select_memos" ON public.memos;
CREATE POLICY "membres_select_memos" ON public.memos
  FOR SELECT TO authenticated
  USING (get_membre_role(enfant_id) IS NOT NULL);

DROP POLICY IF EXISTS "membres_insert_memos" ON public.memos;
CREATE POLICY "membres_insert_memos" ON public.memos
  FOR INSERT TO authenticated
  WITH CHECK (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

DROP POLICY IF EXISTS "membres_update_memos" ON public.memos;
CREATE POLICY "membres_update_memos" ON public.memos
  FOR UPDATE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

DROP POLICY IF EXISTS "membres_delete_memos" ON public.memos;
CREATE POLICY "membres_delete_memos" ON public.memos
  FOR DELETE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

-- 9. nsm_scores (1 policy)
DROP POLICY IF EXISTS "users_own_nsm_scores" ON public.nsm_scores;
CREATE POLICY "users_own_nsm_scores" ON public.nsm_scores
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 10. pepites (1 policy)
DROP POLICY IF EXISTS "membres_all_pepites" ON public.pepites;
CREATE POLICY "membres_all_pepites" ON public.pepites
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM memos m
    JOIN enfant_membres em ON em.enfant_id = m.enfant_id
    WHERE m.id = pepites.memo_id
    AND em.user_id = auth.uid()
    AND em.role = ANY (ARRAY['owner'::text, 'coparent'::text])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM memos m
    JOIN enfant_membres em ON em.enfant_id = m.enfant_id
    WHERE m.id = pepites.memo_id
    AND em.user_id = auth.uid()
    AND em.role = ANY (ARRAY['owner'::text, 'coparent'::text])
  ));

-- 11. profiles (1 policy)
DROP POLICY IF EXISTS "users_own_profile" ON public.profiles;
CREATE POLICY "users_own_profile" ON public.profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 12. sessions_activite (4 policies)
DROP POLICY IF EXISTS "membres_select_sessions" ON public.sessions_activite;
CREATE POLICY "membres_select_sessions" ON public.sessions_activite
  FOR SELECT TO authenticated
  USING (get_membre_role(enfant_id) IS NOT NULL);

DROP POLICY IF EXISTS "membres_insert_sessions" ON public.sessions_activite;
CREATE POLICY "membres_insert_sessions" ON public.sessions_activite
  FOR INSERT TO authenticated
  WITH CHECK (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

DROP POLICY IF EXISTS "membres_update_sessions" ON public.sessions_activite;
CREATE POLICY "membres_update_sessions" ON public.sessions_activite
  FOR UPDATE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

DROP POLICY IF EXISTS "membres_delete_sessions" ON public.sessions_activite;
CREATE POLICY "membres_delete_sessions" ON public.sessions_activite
  FOR DELETE TO authenticated
  USING (get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text]));

-- 13. specialties (SELECT only — INSERT already fixed)
DROP POLICY IF EXISTS "Authenticated users can read specialties" ON public.specialties;
CREATE POLICY "Authenticated users can read specialties" ON public.specialties
  FOR SELECT TO authenticated
  USING (true);

-- 14. syntheses (1 policy)
DROP POLICY IF EXISTS "syntheses_access" ON public.syntheses;
CREATE POLICY "syntheses_access" ON public.syntheses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM enfant_membres
    WHERE enfant_membres.enfant_id = syntheses.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM enfant_membres
    WHERE enfant_membres.enfant_id = syntheses.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));
