import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "./config";

// Request-scoped public reads only; deliberately no elevated key or auth cookie handling.
export function createServerSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
