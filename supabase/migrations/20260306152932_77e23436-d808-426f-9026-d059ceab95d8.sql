
-- 1. Create axes_developpement table
CREATE TABLE public.axes_developpement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id uuid NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  label text NOT NULL,
  couleur text NOT NULL,
  ordre integer DEFAULT 0,
  actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create pepites table
CREATE TABLE public.pepites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES public.memos(id) ON DELETE CASCADE,
  axe_id uuid NOT NULL REFERENCES public.axes_developpement(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (memo_id, axe_id)
);

-- 3. Add backfill_done column to enfants
ALTER TABLE public.enfants ADD COLUMN backfill_done boolean DEFAULT false;

-- 4. Enable RLS
ALTER TABLE public.axes_developpement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pepites ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for axes_developpement
CREATE POLICY "membres_select_axes" ON public.axes_developpement
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enfant_membres
    WHERE enfant_membres.enfant_id = axes_developpement.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

CREATE POLICY "membres_insert_axes" ON public.axes_developpement
  FOR INSERT TO authenticated
  WITH CHECK (get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "membres_update_axes" ON public.axes_developpement
  FOR UPDATE TO authenticated
  USING (get_membre_role(enfant_id) IN ('owner', 'coparent'));

-- 6. RLS policies for pepites
CREATE POLICY "membres_all_pepites" ON public.pepites
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.memos m
    JOIN public.enfant_membres em ON em.enfant_id = m.enfant_id
    WHERE m.id = pepites.memo_id
    AND em.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.memos m
    JOIN public.enfant_membres em ON em.enfant_id = m.enfant_id
    WHERE m.id = pepites.memo_id
    AND em.user_id = auth.uid()
  ));
