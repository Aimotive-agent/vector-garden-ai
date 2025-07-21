-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector_bases table
CREATE TABLE public.vector_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  openai_key_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.vector_bases ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required)
CREATE POLICY "Allow all access to vector_bases" 
ON public.vector_bases 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Update existing documents table to reference vector_bases
ALTER TABLE public.documents 
ADD COLUMN base_id UUID REFERENCES public.vector_bases(id) ON DELETE CASCADE;

-- Create chunks table for vector storage
CREATE TABLE public.chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  page_no INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow all access to chunks" 
ON public.chunks 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create api_keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow all access to api_keys" 
ON public.api_keys 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Update documents table to remove user_id requirement and add status
ALTER TABLE public.documents 
ALTER COLUMN user_id DROP NOT NULL,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded',
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vector_bases
CREATE TRIGGER update_vector_bases_updated_at
    BEFORE UPDATE ON public.vector_bases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();