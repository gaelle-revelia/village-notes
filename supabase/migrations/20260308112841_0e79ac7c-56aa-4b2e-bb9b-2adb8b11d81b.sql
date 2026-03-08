
-- FIX 1: Prevent role escalation on enfant_membres
DROP POLICY IF EXISTS restricted_insert_enfant_membres ON public.enfant_membres;
CREATE POLICY restricted_insert_enfant_membres ON public.enfant_membres
  FOR INSERT
  WITH CHECK (
    (
      EXISTS (SELECT 1 FROM enfants WHERE enfants.id = enfant_membres.enfant_id AND enfants.user_id = auth.uid())
      AND role = 'owner'
    )
    OR
    (
      get_membre_role(enfant_id) = ANY (ARRAY['owner'::text, 'coparent'::text])
      AND role = ANY (ARRAY['coparent'::text, 'famille'::text])
    )
  );

-- FIX 2: Restrict pepites to owner/coparent only
DROP POLICY IF EXISTS membres_all_pepites ON public.pepites;
CREATE POLICY membres_all_pepites ON public.pepites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memos m
      JOIN enfant_membres em ON em.enfant_id = m.enfant_id
      WHERE m.id = pepites.memo_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'coparent')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memos m
      JOIN enfant_membres em ON em.enfant_id = m.enfant_id
      WHERE m.id = pepites.memo_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'coparent')
    )
  );
