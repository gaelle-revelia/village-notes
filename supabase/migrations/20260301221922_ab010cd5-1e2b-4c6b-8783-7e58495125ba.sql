ALTER TABLE public.memos
DROP CONSTRAINT IF EXISTS memos_type_check;

ALTER TABLE public.memos
ADD CONSTRAINT memos_type_check
CHECK (
  type = ANY (ARRAY['vocal'::text, 'note'::text, 'document'::text, 'evenement'::text, 'activite'::text])
);