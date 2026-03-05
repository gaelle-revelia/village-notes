CREATE POLICY "authenticated_upload_synthesis"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-temp' AND (storage.foldername(name))[1] = 'synthesis');