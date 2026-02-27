
-- Create audio-temp storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-temp', 'audio-temp', false);

-- RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload audio to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'audio-temp'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: authenticated users can read their own files
CREATE POLICY "Users can read own audio files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'audio-temp'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: authenticated users can delete their own files
CREATE POLICY "Users can delete own audio files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'audio-temp'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
