import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text chunking function
function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChunkSize;
    
    // Try to break at sentence boundaries
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }
  
  return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
}

// Simple embedding function using OpenAI API
async function generateEmbedding(text: string): Promise<number[]> {
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

// Extract text from different file types
async function extractText(fileBuffer: ArrayBuffer, mimeType: string, fileName: string): Promise<string> {
  if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
    return new TextDecoder().decode(fileBuffer);
  }
  
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    // For PDF processing, we'll use a simple approach
    // In a production app, you'd want to use a proper PDF parser
    try {
      const pdfText = new TextDecoder().decode(fileBuffer);
      // This is a very basic text extraction - you might want to use a proper PDF library
      return pdfText.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (error) {
      console.error('PDF parsing error:', error);
      return 'Unable to extract text from PDF file.';
    }
  }
  
  // For other file types, try to decode as text
  try {
    return new TextDecoder().decode(fileBuffer);
  } catch {
    return `Content from ${fileName} (${mimeType})`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Error fetching document:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('case-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract text from file
    const fileBuffer = await fileData.arrayBuffer();
    const extractedText = await extractText(fileBuffer, document.mime_type || '', document.file_name);

    if (!extractedText || extractedText.length < 10) {
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);

      return new Response(
        JSON.stringify({ error: 'No meaningful text could be extracted from the file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Chunk the text
    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks from document ${documentId}`);

    // Process chunks in batches to avoid overwhelming the API
    const batchSize = 5;
    let processedChunks = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const chunkIndex = i + j;
        
        try {
          // Generate embedding
          const embedding = await generateEmbedding(chunk);
          
          // Store chunk with embedding
          const { error: chunkError } = await supabase
            .from('chunks')
            .insert({
              document_id: documentId,
              content: chunk,
              embedding: embedding, // Store as array directly
              metadata: {
                chunk_index: chunkIndex,
                file_name: document.file_name,
                mime_type: document.mime_type
              }
            });

          if (chunkError) {
            console.error('Error storing chunk:', chunkError);
          } else {
            processedChunks++;
          }
        } catch (error) {
          console.error(`Error processing chunk ${chunkIndex}:`, error);
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update document status
    await supabase
      .from('documents')
      .update({ 
        status: 'processed',
        chunk_count: processedChunks
      })
      .eq('id', documentId);

    console.log(`Successfully processed document ${documentId} with ${processedChunks} chunks`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Document processed successfully with ${processedChunks} chunks`,
        chunksCreated: processedChunks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-document function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});