-- Update documents table to work with vector_bases instead of cases
-- First, make case_id nullable and base_id not nullable
ALTER TABLE public.documents 
ALTER COLUMN case_id DROP NOT NULL;

ALTER TABLE public.documents 
ALTER COLUMN base_id SET NOT NULL;

-- Update foreign key constraint to reference vector_bases
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_case_id_fkey;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_base_id_fkey 
FOREIGN KEY (base_id) REFERENCES public.vector_bases(id) ON DELETE CASCADE;