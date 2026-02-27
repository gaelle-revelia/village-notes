
-- Create voice-memos storage bucket (temporary, files deleted after transcription)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-memos', 'voice-memos', false);

-- Authenticated users can upload to their own folder
CREATE POLICY "Users upload own voice memos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Authenticated users can read their own files
CREATE POLICY "Users read own voice memos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role can delete (edge function uses service role)
CREATE POLICY "Service can delete voice memos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voice-memos' AND auth.uid()::text = (storage.foldername(name))[1]);
