DROP POLICY IF EXISTS "Authenticated users can insert specialties" ON public.specialties;

CREATE POLICY "Authenticated users can insert specialties" ON public.specialties
  FOR INSERT TO authenticated
  WITH CHECK (true);