-- Fix documents table RLS policies to work without authentication
-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- Create new policies that allow all operations without user authentication
CREATE POLICY "Allow all access to documents" 
ON public.documents 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Make user_id nullable and remove the constraint
ALTER TABLE public.documents ALTER COLUMN user_id DROP NOT NULL;