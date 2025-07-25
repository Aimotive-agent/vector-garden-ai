-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow all access to documents" ON public.documents;

-- Create more specific policies for documents
-- Allow anyone to view documents (for public vector bases)
CREATE POLICY "Anyone can view documents" 
ON public.documents 
FOR SELECT 
USING (true);

-- Allow anyone to insert documents (for vector base uploads)
CREATE POLICY "Anyone can insert documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update documents (for processing status updates)
CREATE POLICY "Anyone can update documents" 
ON public.documents 
FOR UPDATE 
USING (true);

-- Allow anyone to delete documents (for cleanup)
CREATE POLICY "Anyone can delete documents" 
ON public.documents 
FOR DELETE 
USING (true);