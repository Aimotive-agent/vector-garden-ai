import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { baseId } = await req.json();

    if (!baseId) {
      return new Response(
        JSON.stringify({ error: 'Base ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create test document
    const { data: testDoc, error: docError } = await supabase
      .from('documents')
      .insert({
        file_name: 'sample-knowledge.txt',
        file_path: 'test/sample-knowledge.txt',
        mime_type: 'text/plain',
        base_id: baseId,
        status: 'processed',
        chunk_count: 3,
        file_size: 2000
      })
      .select()
      .single();

    if (docError) {
      throw docError;
    }

    // Sample content chunks
    const sampleChunks = [
      "This is a comprehensive knowledge base containing important information about artificial intelligence and machine learning. AI has revolutionized many industries including healthcare, finance, and technology.",
      "Machine learning algorithms can be categorized into supervised learning, unsupervised learning, and reinforcement learning. Each type serves different purposes and uses different training methodologies.",
      "Natural language processing (NLP) is a branch of AI that focuses on the interaction between computers and humans through natural language. NLP enables machines to understand, interpret, and generate human language."
    ];

    let chunksCreated = 0;

    for (let i = 0; i < sampleChunks.length; i++) {
      const chunk = sampleChunks[i];
      
      // Generate embedding
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: chunk,
        }),
      });

      if (!embeddingResponse.ok) {
        console.error('OpenAI API error:', embeddingResponse.statusText);
        continue;
      }

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;

      // Store chunk
      const { error: chunkError } = await supabase
        .from('chunks')
        .insert({
          document_id: testDoc.id,
          content: chunk,
          embedding: embedding,
          metadata: {
            chunk_index: i,
            file_name: 'sample-knowledge.txt',
            mime_type: 'text/plain'
          }
        });

      if (chunkError) {
        console.error('Error storing chunk:', chunkError);
      } else {
        chunksCreated++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test data created with ${chunksCreated} chunks`,
        documentId: testDoc.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-test-data function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});