
-- PART 1: Add new columns
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'question',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS is_approximate_date boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_rdv_id uuid REFERENCES public.questions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- PART 2: Add type constraint
ALTER TABLE public.questions
  ADD CONSTRAINT questions_type_check
  CHECK (type IN ('rdv', 'rappel', 'question'));

-- PART 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_questions_child_archived
  ON public.questions(child_id, archived_at);

-- PART 4: Replace restrictive RLS policies with co-parent-aware policies
DROP POLICY IF EXISTS "parents_select_own_questions" ON public.questions;
DROP POLICY IF EXISTS "parents_insert_own_questions" ON public.questions;
DROP POLICY IF EXISTS "parents_update_own_questions" ON public.questions;
DROP POLICY IF EXISTS "parents_delete_own_questions" ON public.questions;

CREATE POLICY "questions_select"
ON public.questions FOR SELECT TO authenticated
USING (get_membre_role(child_id) IN ('owner', 'coparent', 'famille'));

CREATE POLICY "questions_insert"
ON public.questions FOR INSERT TO authenticated
WITH CHECK (get_membre_role(child_id) IN ('owner', 'coparent'));

CREATE POLICY "questions_update"
ON public.questions FOR UPDATE TO authenticated
USING (get_membre_role(child_id) IN ('owner', 'coparent'))
WITH CHECK (get_membre_role(child_id) IN ('owner', 'coparent'));

CREATE POLICY "questions_delete"
ON public.questions FOR DELETE TO authenticated
USING (get_membre_role(child_id) IN ('owner', 'coparent'));
