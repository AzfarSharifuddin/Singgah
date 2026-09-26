export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  }
  if (!key.startsWith("sb_publishable_")) {
    throw new Error("Use a Supabase publishable key, never a secret or service-role key.");
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Hosted Supabase requires an HTTPS URL.");
  return { url, key };
}
