
-- Phase 1: Create enfant_membres table
CREATE TABLE public.enfant_membres (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enfant_id   uuid NOT NULL REFERENCES enfants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'coparent',
  invited_by  uuid REFERENCES auth.users(id),
  joined_at   timestamptz DEFAULT now(),
  UNIQUE(enfant_id, user_id)
);

ALTER TABLE public.enfant_membres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_membership"
  ON public.enfant_membres FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_can_insert"
  ON public.enfant_membres FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Phase 2: Backfill existing users as 'owner'
INSERT INTO public.enfant_membres (enfant_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.enfants;

-- Phase 3: Helper function for RLS
CREATE OR REPLACE FUNCTION public.get_membre_role(eid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.enfant_membres
  WHERE enfant_id = eid AND user_id = auth.uid()
  LIMIT 1;
$$;
