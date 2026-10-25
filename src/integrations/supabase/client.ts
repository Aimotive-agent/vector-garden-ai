// Supabase client — homelab self-hosted stack (OpenShip Supabase on 192.168.1.42).
// Overridable at build time via VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "http://192.168.1.42:8000";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2MDA5MjQ5LCJleHAiOjIxMDEzNjkyNDl9.Tb4mts5kWwOFsqkjUmMJP-qkdEY7Sz1c5hgJAv6BLuo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
