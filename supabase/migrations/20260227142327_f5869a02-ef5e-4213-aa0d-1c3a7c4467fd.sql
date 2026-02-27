
-- Table enfants
CREATE TABLE public.enfants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  prenom text NOT NULL,
  date_naissance date,
  diagnostic_label text,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.enfants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_enfants" ON public.enfants FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Table intervenants
CREATE TABLE public.intervenants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enfant_id uuid REFERENCES public.enfants(id) ON DELETE CASCADE NOT NULL,
  nom text NOT NULL,
  specialite text,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.intervenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_intervenants" ON public.intervenants FOR ALL USING (
  enfant_id IN (SELECT id FROM public.enfants WHERE user_id = auth.uid())
) WITH CHECK (
  enfant_id IN (SELECT id FROM public.enfants WHERE user_id = auth.uid())
);

-- Table memos
CREATE TABLE public.memos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  enfant_id uuid REFERENCES public.enfants(id),
  intervenant_id uuid REFERENCES public.intervenants(id),
  transcription_raw text,
  content_structured jsonb,
  processing_status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_memos" ON public.memos FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Full-text search index (French)
CREATE INDEX memo_search_idx ON public.memos
USING GIN (to_tsvector('french',
  coalesce(transcription_raw, '') || ' ' ||
  coalesce(content_structured::text, '')
));

-- Table nsm_scores
CREATE TABLE public.nsm_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  score integer CHECK (score >= 0 AND score <= 10) NOT NULL,
  measured_at timestamptz DEFAULT now() NOT NULL,
  context text
);
ALTER TABLE public.nsm_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_nsm_scores" ON public.nsm_scores FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
