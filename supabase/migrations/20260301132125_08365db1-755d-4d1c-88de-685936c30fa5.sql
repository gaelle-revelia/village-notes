
-- Phase 8: Invitations table
CREATE TABLE public.invitations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enfant_id   uuid NOT NULL REFERENCES enfants(id),
  invited_by  uuid NOT NULL REFERENCES auth.users(id),
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'coparent',
  token       uuid DEFAULT gen_random_uuid() UNIQUE,
  status      text DEFAULT 'pending',
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz DEFAULT now() + interval '7 days'
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Only the inviter can manage their invitations
CREATE POLICY "owners_manage_invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());
