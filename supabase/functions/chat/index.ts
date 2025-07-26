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
    const { message, baseId } = await req.json();

    if (!message || !baseId) {
      return new Response(
        JSON.stringify({ error: 'Message and baseId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get relevant chunks from the vector base
    const { data: chunks, error: chunksError } = await supabase
      .from('chunks')
      .select(`
        content,
        metadata,
        documents!inner(base_id)
      `)
      .eq('documents.base_id', baseId)
      .limit(5);

    if (chunksError) {
      console.error('Error fetching chunks:', chunksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch relevant documents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from chunks
    const context = chunks?.map(chunk => chunk.content).join('\n\n') || '';

    // Simple response based on context (you can enhance this with OpenAI later)
    const response = `Based on the documents in this knowledge base, I can help answer your question: "${message}"\n\nContext found: ${context.length > 0 ? 'Yes, relevant information found.' : 'No specific context found for this query.'}`;

    return new Response(
      JSON.stringify({ response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});