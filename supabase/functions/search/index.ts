// Veritas Vector Garden — semantic search over a vector base.
// Request: { base_id, query, top_k? }
// Response: [{ id, content, metadata, score }]  (score = cosine similarity)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMBED_URL = Deno.env.get("EMBEDDINGS_BASE_URL") ?? "http://192.168.1.42:11434";
const EMBED_MODEL = Deno.env.get("EMBEDDINGS_MODEL") ?? "embeddinggemma";

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${EMBED_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`Embedding service error: ${res.status}`);
  const data = await res.json();
  return data.embedding;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { base_id, query, top_k } = await req.json();
    if (!query) return json({ error: "query is required" }, 400);

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "http://192.168.1.42:8000",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2MDA5MjQ5LCJleHAiOjIxMDEzNjkyNDl9.Tb4mts5kWwOFsqkjUmMJP-qkdEY7Sz1c5hgJAv6BLuo",
      {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
        auth: { persistSession: false },
      },
    );

    const queryEmbedding = await embed(query);
    const { data: chunks, error } = await supabase.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0.1,
      match_count: top_k ?? 5,
      base_id_filter: base_id ?? null,
    });

    if (error) {
      console.error("match_chunks error:", error);
      return json({ error: "Search failed" }, 500);
    }

    return json(
      (chunks ?? []).map((c: { id: string; content: string; metadata: unknown; similarity: number }) => ({
        id: c.id,
        content: c.content,
        metadata: c.metadata,
        score: c.similarity,
      })),
    );
  } catch (error) {
    console.error("Error in search function:", error);
    return json({ error: (error as Error).message || "Internal server error" }, 500);
  }
});
