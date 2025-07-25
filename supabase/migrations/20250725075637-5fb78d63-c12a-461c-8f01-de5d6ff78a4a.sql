-- Ensure the storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('case-documents', 'case-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies for this bucket
DROP POLICY IF EXISTS "Anyone can upload to case-documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view case-documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update case-documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete case-documents" ON storage.objects;

-- Create permissive storage policies (PostgreSQL 12+ syntax)
CREATE POLICY "Anyone can upload to case-documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'case-documents');

CREATE POLICY "Anyone can view case-documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'case-documents');

CREATE POLICY "Anyone can update case-documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'case-documents');

CREATE POLICY "Anyone can delete case-documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'case-documents');