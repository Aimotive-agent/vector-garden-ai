-- Check current RLS policies on documents table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'documents';

-- Also ensure the storage bucket exists and has proper policies
INSERT INTO storage.buckets (id, name, public) 
VALUES ('case-documents', 'case-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies for the bucket
INSERT INTO storage.objects (bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata)
SELECT 'case-documents', 'test', null, now(), now(), now(), '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'case-documents' LIMIT 1);

-- Delete the test object
DELETE FROM storage.objects WHERE bucket_id = 'case-documents' AND name = 'test';

-- Create permissive storage policies
CREATE POLICY IF NOT EXISTS "Anyone can upload to case-documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'case-documents');

CREATE POLICY IF NOT EXISTS "Anyone can view case-documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'case-documents');

CREATE POLICY IF NOT EXISTS "Anyone can update case-documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'case-documents');

CREATE POLICY IF NOT EXISTS "Anyone can delete case-documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'case-documents');