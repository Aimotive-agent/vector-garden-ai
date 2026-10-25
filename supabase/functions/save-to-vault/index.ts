import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, base_id } = await req.json();

    if (!content || !base_id) {
      return new Response(
        JSON.stringify({ error: 'Content and base_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    // Act as the signed-in user (anon key + forwarded JWT): RLS authorizes,
    // and no service-role key exists in code.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? 'http://192.168.1.42:8000',
      Deno.env.get('SUPABASE_ANON_KEY') ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2MDA5MjQ5LCJleHAiOjIxMDEzNjkyNDl9.Tb4mts5kWwOFsqkjUmMJP-qkdEY7Sz1c5hgJAv6BLuo',
      {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
        auth: { persistSession: false },
      }
    );

    // Create a new document entry for the saved content
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        file_name: `saved_response_${Date.now()}.txt`,
        file_path: `vault/${base_id}/saved_response_${Date.now()}.txt`,
        mime_type: 'text/plain',
        base_id: base_id,
        status: 'processed'
      })
      .select()
      .single();

    if (docError) {
      console.error('Error creating document:', docError);
      return new Response(
        JSON.stringify({ error: 'Failed to create document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a chunk for the saved content (embedded so it is searchable)
    let embedding: number[] | null = null;
    try {
      const EMBED_URL = Deno.env.get('EMBEDDINGS_BASE_URL') ?? 'http://192.168.1.42:11434';
      const EMBED_MODEL = Deno.env.get('EMBEDDINGS_MODEL') ?? 'embeddinggemma';
      const embedRes = await fetch(`${EMBED_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: EMBED_MODEL, prompt: content.slice(0, 8000) }),
      });
      if (embedRes.ok) embedding = (await embedRes.json()).embedding;
    } catch (e) {
      console.error('Embedding failed, saving without vector:', e);
    }

    const { error: chunkError } = await supabase
      .from('chunks')
      .insert({
        document_id: document.id,
        content: content,
        embedding,
        metadata: {
          source: 'saved_ai_response',
          saved_at: new Date().toISOString()
        }
      });

    if (chunkError) {
      console.error('Error creating chunk:', chunkError);
      return new Response(
        JSON.stringify({ error: 'Failed to save content to vault' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Content saved to vault successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in save-to-vault function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});