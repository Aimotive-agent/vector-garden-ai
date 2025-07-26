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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    // Create a chunk for the saved content
    const { error: chunkError } = await supabase
      .from('chunks')
      .insert({
        document_id: document.id,
        content: content,
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