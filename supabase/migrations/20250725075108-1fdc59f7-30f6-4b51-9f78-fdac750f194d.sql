
-- Make case_id nullable since we're using base_id for vector bases
ALTER TABLE public.documents ALTER COLUMN case_id DROP NOT NULL;

-- Add a check constraint to ensure either case_id or base_id is provided
ALTER TABLE public.documents ADD CONSTRAINT documents_case_or_base_check 
CHECK (case_id IS NOT NULL OR base_id IS NOT NULL);
