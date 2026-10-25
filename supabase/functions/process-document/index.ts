import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text chunking function
function chunkText(text: string, maxChunkSize: number = 800, overlap: number = 100): string[] {
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
    
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 20) { // Only include meaningful chunks
      chunks.push(chunk);
    }
    
    start = end - overlap;
  }
  
  return chunks;
}

// Simple embedding function using the homelab Ollama service (no cloud key)
const EMBED_URL = Deno.env.get('EMBEDDINGS_BASE_URL') ?? 'http://192.168.1.42:11434';
const EMBED_MODEL = Deno.env.get('EMBEDDINGS_MODEL') ?? 'embeddinggemma';

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch(`${EMBED_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBED_MODEL,
      prompt: text.substring(0, 8000), // Limit to avoid token limits
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding service error: ${response.status}`);
  }

  const data = await response.json();
  return data.embedding;
}

// Extract text from different file types - simplified for efficiency
async function extractText(fileBuffer: ArrayBuffer, mimeType: string, fileName: string): Promise<string> {
  if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
    return new TextDecoder().decode(fileBuffer);
  }
  
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    // Simple PDF text extraction - just look for readable text
    const text = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false }).decode(fileBuffer);
    
    // Extract readable text patterns from PDF
    const readableText = text
      .replace(/[^\x20-\x7E\s]/g, ' ') // Keep only printable ASCII and whitespace
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // If we get very little text, it might be a scanned PDF
    if (readableText.length < 100) {
      return `This appears to be a scanned PDF (${fileName}). For better text extraction, please convert to a searchable PDF first.`;
    }
    
    return readableText;
  }
  
  // For other file types, try to decode as text
  try {
    return new TextDecoder().decode(fileBuffer);
  } catch {
    return `Content from ${fileName} (${mimeType}) - text extraction not supported for this file type.`;
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

    console.log(`Processing document: ${document.file_name}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('case-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError);
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', documentId);
      
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

    console.log(`Extracted ${extractedText.length} characters from ${document.file_name}`);

    // Chunk the text
    const chunks = chunkText(extractedText);
    console.log(`Created ${chunks.length} chunks from document ${documentId}`);

    // Process chunks in small batches to avoid memory issues
    const batchSize = 3;
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
              embedding: embedding,
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
            console.log(`Processed chunk ${processedChunks}/${chunks.length}`);
          }
        } catch (error) {
          console.error(`Error processing chunk ${chunkIndex}:`, error);
        }
      }
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
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