
-- Add 3 new columns to memos table
ALTER TABLE public.memos
  ADD COLUMN type text NOT NULL DEFAULT 'vocal',
  ADD COLUMN memo_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN file_url text;

-- Add CHECK constraint for type values
ALTER TABLE public.memos
  ADD CONSTRAINT memos_type_check CHECK (type IN ('vocal', 'note', 'document', 'evenement'));
