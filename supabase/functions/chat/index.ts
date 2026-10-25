// Veritas Vector Garden — RAG chat.
// Embeddings: local Ollama (embeddinggemma, 768-dim) on the homelab.
// Completions: AI gateway (env AI_BASE_URL / AI_API_KEY / AI_MODEL — DeepSeek).
// No user-supplied keys required; nothing here is reachable from the SPA bundle.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMBED_URL = Deno.env.get("EMBEDDINGS_BASE_URL") ?? "http://192.168.1.42:11434";
const EMBED_MODEL = Deno.env.get("EMBEDDINGS_MODEL") ?? "embeddinggemma";
const AI_BASE_URL = Deno.env.get("AI_BASE_URL") ?? "https://api.deepseek.com/v1";
const AI_API_KEY = Deno.env.get("AI_API_KEY") ?? "";
const AI_MODEL = Deno.env.get("AI_MODEL") ?? "deepseek-chat";

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
    const { messages, base_id } = await req.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages array is required" }, 400);
    }

    const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    if (!lastUserMessage) return json({ error: "No user message found" }, 400);

    // Act as the signed-in user (anon key + forwarded JWT): RLS authorizes,
    // and no service-role key exists in code.
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "http://192.168.1.42:8000",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2MDA5MjQ5LCJleHAiOjIxMDEzNjkyNDl9.Tb4mts5kWwOFsqkjUmMJP-qkdEY7Sz1c5hgJAv6BLuo",
      {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
        auth: { persistSession: false },
      },
    );

    // Retrieve relevant chunks for this base
    let context = "";
    try {
      const queryEmbedding = await embed(lastUserMessage.content);
      const { data: chunks, error } = await supabase.rpc("match_chunks", {
        query_embedding: queryEmbedding,
        match_threshold: 0.3,
        match_count: 5,
        base_id_filter: base_id ?? null,
      });
      if (!error && chunks && chunks.length > 0) {
        context = chunks.map((c: { content: string }) => c.content).join("\n\n");
      }
    } catch (e) {
      console.error("Retrieval failed, answering without context:", e);
    }

    const systemPrompt = context
      ? `You are the AI assistant for Veritas Vector Garden, a vector knowledge base. Answer using the document context below when relevant. If the context lacks the answer, say so clearly and suggest what the user could upload.

Document context:
${context}`
      : `You are the AI assistant for Veritas Vector Garden, a vector knowledge base. No relevant stored context was found for this question — say so clearly and suggest what the user could upload, or answer generally if the question is general.`;

    // Chat history for the model (drop the UI greeting message)
    const history = messages
      .filter((m: { id?: string; role: string }) => m.role !== "assistant" || m.id !== "1")
      .slice(-12);

    const completionRes = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...history],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!completionRes.ok) {
      const err = await completionRes.json().catch(() => ({}));
      return json({ error: `AI gateway error: ${completionRes.status} - ${err?.error?.message ?? "unknown"}` }, 502);
    }

    const data = await completionRes.json();
    const response = data.choices?.[0]?.message?.content ??
      "I'm sorry, I couldn't generate a response. Please try again.";
    return json({ response });
  } catch (error) {
    console.error("Error in chat function:", error);
    return json({ error: (error as Error).message || "Internal server error" }, 500);
  }
});
