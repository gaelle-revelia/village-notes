-- Create questions table following existing project conventions
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  child_id uuid NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  text text NOT NULL,
  linked_pro_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'to_ask',
  answer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  asked_at timestamp with time zone,
  show_in_timeline boolean NOT NULL DEFAULT true
);

-- Validate allowed question statuses
CREATE OR REPLACE FUNCTION public.validate_question_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('to_ask', 'asked') THEN
    RAISE EXCEPTION 'Invalid question status: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_question_status_trigger
BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.validate_question_status();

-- Enable Row Level Security
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Parents can read only their own questions
CREATE POLICY "parents_select_own_questions"
ON public.questions
FOR SELECT
TO authenticated
USING (parent_id = auth.uid());

-- Parents can create only their own questions for their own children
CREATE POLICY "parents_insert_own_questions"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (
  parent_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.enfants e
    WHERE e.id = child_id
      AND e.user_id = auth.uid()
  )
);

-- Parents can update only their own questions for their own children
CREATE POLICY "parents_update_own_questions"
ON public.questions
FOR UPDATE
TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (
  parent_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.enfants e
    WHERE e.id = child_id
      AND e.user_id = auth.uid()
  )
);

-- Parents can delete only their own questions
CREATE POLICY "parents_delete_own_questions"
ON public.questions
FOR DELETE
TO authenticated
USING (parent_id = auth.uid());