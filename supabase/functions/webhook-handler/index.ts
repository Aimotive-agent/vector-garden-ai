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
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const baseId = pathParts[pathParts.length - 2]; // Extract base ID from path

    if (!baseId) {
      return new Response(JSON.stringify({ error: 'Base ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    if (req.method === 'POST') {
      // Handle incoming webhook data
      const body = await req.json();
      console.log('Webhook received for base:', baseId, body);

      // Store webhook data or trigger processing
      const { data, error } = await supabase
        .from('chunks')
        .insert({
          document_id: baseId,
          content: JSON.stringify(body),
          metadata: { 
            source: 'webhook',
            timestamp: new Date().toISOString(),
            ...body.metadata 
          }
        });

      if (error) {
        console.error('Error storing webhook data:', error);
        return new Response(JSON.stringify({ error: 'Failed to store webhook data' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      // Return vector base data and files
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('case_id', baseId);

      if (docsError) {
        console.error('Error fetching documents:', docsError);
        return new Response(JSON.stringify({ error: 'Failed to fetch documents' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: chunks, error: chunksError } = await supabase
        .from('chunks')
        .select('*')
        .eq('document_id', baseId);

      if (chunksError) {
        console.error('Error fetching chunks:', chunksError);
        return new Response(JSON.stringify({ error: 'Failed to fetch chunks' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        documents, 
        chunks,
        baseId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});