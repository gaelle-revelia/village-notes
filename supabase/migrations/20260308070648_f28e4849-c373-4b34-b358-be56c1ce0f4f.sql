
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "authenticated_can_insert" ON public.enfant_membres;

-- Create a restrictive insert policy:
-- Allow if user is already owner/coparent on this enfant (via get_membre_role)
-- OR if user is the enfant creator (for initial self-insert during onboarding)
CREATE POLICY "restricted_insert_enfant_membres"
ON public.enfant_membres
FOR INSERT
TO authenticated
WITH CHECK (
  get_membre_role(enfant_id) IN ('owner', 'coparent')
  OR EXISTS (
    SELECT 1 FROM public.enfants
    WHERE enfants.id = enfant_id
    AND enfants.user_id = auth.uid()
  )
);
