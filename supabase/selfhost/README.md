# Self-hosted Supabase (OpenShip / homelab) — deployment runbook

Veritas Vector Garden runs against the **OpenShip self-hosted Supabase stack** on the
homelab (`192.168.1.42`) — the same stack as Veritas Tax AI and Veritas SynapseCore.
This file documents how the connection is wired so it can be re-applied after a rebuild.

## Endpoints

| Piece | Value |
|---|---|
| Supabase API (Kong) | `http://192.168.1.42:8000` |
| Postgres | `192.168.1.42:5433` (user `postgres`) |
| Studio | `http://192.168.1.42:3003` |
| Embeddings (Ollama) | `http://192.168.1.42:11434` — model `embeddinggemma` (768-dim) |
| AI chat gateway | DeepSeek via `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` on `openship-supabase-functions` |
| Docker network | `openship-supabase` |
| Functions root | `/var/lib/openship/app-config/proj_JQsSyX0Y7-PzvYEK/functions` |
| Anon (publishable) key | Kong env `ANON_KEY` — the same public anon key shared by the Veritas apps |

The frontend reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, defaulting to the
values in `src/integrations/supabase/client.ts` (LAN URL + anon key baked in).

## Auth

GoTrue runs with `GOTRUE_MAILER_AUTOCONFIRM=true` — signups are confirmed instantly and
return a session immediately (no SMTP, no email verification). The app requires sign-in
(`src/contexts/AuthContext.tsx` + `src/pages/Auth.tsx`); RLS on every table and the
`case-documents` storage bucket is scoped to `authenticated`.

## Database schema

`supabase/selfhost/schema.sql` is a fully **idempotent** script (safe to re-run): it creates
`vector_bases`, `documents`, `chunks` (pgvector 768), `api_keys`, `cases`, `profiles`, the
`match_chunks` RPC, the `case-documents` storage bucket, and all RLS policies/triggers.

```bash
cat supabase/selfhost/schema.sql | ssh root@192.168.1.42 \
  'docker exec -i openship-supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1'
```

`supabase/migrations/*.sql` are the original Lovable-era migrations (kept for provenance;
they target a hosted project with OpenAI 1536-dim embeddings); `schema.sql` is the
reconciled source of truth for the homelab.

## Edge functions

All RAG processing happens server-side. Deploy each `supabase/functions/<name>/index.ts`:

```bash
for fn in chat search process-document save-to-vault create-test-data webhook-handler; do
  ssh root@192.168.1.42 "mkdir -p /var/lib/openship/app-config/proj_JQsSyX0Y7-PzvYEK/functions/$fn"
  scp supabase/functions/$fn/index.ts \
    root@192.168.1.42:/var/lib/openship/app-config/proj_JQsSyX0Y7-PzvYEK/functions/$fn/index.ts
done
```

(The edge router resolves `/functions/v1/<name>` per request — new function directories
are picked up without a container restart.)

| Function | What it does |
|---|---|
| `chat` | Embed query (Ollama) → `match_chunks` retrieval → DeepSeek completion → `{response}` |
| `search` | Embed query → `match_chunks` → `[{id, content, metadata, score}]` |
| `process-document` | Download from `case-documents` → extract → chunk → embed (Ollama) → store |
| `save-to-vault` | Save an AI answer as a document + embedded chunk (searchable) |
| `create-test-data` | Seed a base with sample embedded chunks |
| `webhook-handler` | Legacy inbound-webhook ingest (unused by the UI) |

### Design note: no service-role key anywhere

Each function acts **as the signed-in user**: it uses the public anon key and forwards the
request's `Authorization` JWT into the Supabase client, so RLS authorizes every query and
no service-role key exists in code or in the repo. `match_chunks` is `SECURITY DEFINER`.

### Embeddings and chat provider

- Embeddings: **local Ollama** `embeddinggemma` (768-dim) — override with
  `EMBEDDINGS_BASE_URL` / `EMBEDDINGS_MODEL` if needed. `chunks.embedding` and
  `match_chunks()` are sized for 768 dims; if you switch models, recreate the column/RPC.
- Completions: `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` (currently DeepSeek), same env the
  SynapseCore `vv-ai` function uses.

## Deploy (OpenShip)

Project **Veritas Vector Garden** (`proj_...`), server "This Server", port **3152**,
framework `vite`, `npm install` → `npm run build` (output `dist`), start
`node server.cjs` (zero-dep static server with SPA fallback). Auto-deploy on push is
**off** — trigger builds manually.

## Notes for outside-LAN access

External visitors cannot reach `http://192.168.1.42:8000`. If the app is exposed publicly,
Kong must also be tunneled and the app rebuilt with `VITE_SUPABASE_URL` set to the public
Supabase URL (one env var at build time). Tunnel/DNS config is managed by the user only.
