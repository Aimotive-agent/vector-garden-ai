-- Remove case_id dependency from documents table
-- Make case_id nullable and base_id required
ALTER TABLE public.documents 
ALTER COLUMN case_id DROP NOT NULL;

-- Remove the foreign key constraint if it exists
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_case_id_fkey;

-- Make base_id required and add proper foreign key
ALTER TABLE public.documents 
ALTER COLUMN base_id SET NOT NULL;

-- Add foreign key constraint for base_id
ALTER TABLE public.documents 
ADD CONSTRAINT documents_base_id_fkey 
FOREIGN KEY (base_id) REFERENCES public.vector_bases(id) ON DELETE CASCADE;