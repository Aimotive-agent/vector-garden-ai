import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate embedding for query
async function generateQueryEmbedding(text: string): Promise<number[]> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Generate AI response using OpenAI
async function generateResponse(query: string, context: string): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that answers questions based on the provided document context. Use the context to provide accurate and relevant answers. If the context doesn\'t contain enough information to answer the question, say so clearly.'
        },
        {
          role: 'user',
          content: `Context from documents:\n${context}\n\nQuestion: ${query}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, base_id } = await req.json();

    if (!messages || !base_id || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array and base_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: 'No user message found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate embedding for the user's query
    const queryEmbedding = await generateQueryEmbedding(lastUserMessage.content);

    // Find relevant chunks using vector similarity search
    const { data: chunks, error: chunksError } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
      base_id_filter: base_id
    });

    if (chunksError) {
      console.error('Error finding relevant chunks:', chunksError);
      // Fallback to simple text search if vector search fails
      const { data: fallbackChunks, error: fallbackError } = await supabase
        .from('chunks')
        .select(`
          content,
          metadata,
          documents!inner(base_id)
        `)
        .eq('documents.base_id', base_id)
        .textSearch('content', lastUserMessage.content.split(' ').join(' & '))
        .limit(3);

      if (fallbackError || !fallbackChunks || fallbackChunks.length === 0) {
        return new Response(
          JSON.stringify({ 
            response: `I couldn't find any relevant information in the knowledge base to answer: "${lastUserMessage.content}". Please make sure documents have been uploaded and processed successfully.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const context = fallbackChunks.map(chunk => chunk.content).join('\n\n');
      const response = await generateResponse(lastUserMessage.content, context);

      return new Response(
        JSON.stringify({ response }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ 
          response: `I couldn't find any relevant information in the knowledge base to answer: "${lastUserMessage.content}". Please make sure documents have been uploaded and processed successfully.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from relevant chunks
    const context = chunks.map(chunk => chunk.content).join('\n\n');
    console.log(`Found ${chunks.length} relevant chunks for query: "${lastUserMessage.content}"`);

    // Generate AI response using the context
    const response = await generateResponse(lastUserMessage.content, context);

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