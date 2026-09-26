"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "./config";

let browserClient: ReturnType<typeof createClient<Database>> | undefined;

// Used only for customer actions. Public browsing continues on the stateless server client.
export function createBrowserSupabaseClient() {
  if (browserClient) return browserClient;
  const { url, key } = getSupabaseConfig();
  browserClient = createClient<Database>(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return browserClient;
}
