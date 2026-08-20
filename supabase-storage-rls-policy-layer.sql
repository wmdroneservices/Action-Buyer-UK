-- Supabase Storage RLS Policy Layer
-- Protects customer-uploaded drone documents

-- Storage bucket: quote-documents

-- Customers can upload into their own folder
CREATE POLICY "Customers upload own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'quote-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Customers can view their own documents
CREATE POLICY "Customers view own documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'quote-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin users can access all documents
CREATE POLICY "Admins manage documents"
ON storage.objects
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Recommended storage paths:
-- quote-documents/{user_id}/photos/
-- quote-documents/{user_id}/ownership/
-- quote-documents/{user_id}/inspection/
