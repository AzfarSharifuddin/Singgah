import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database.ts";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

async function main() {
  const { url, key } = getSupabaseConfig();
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: vendors, error } = await client.from("vendors")
    .select("id,slug,category_id,subcategory_id,state_id,city_id,area_id")
    .eq("slug", "aisyah-dessert");
  if (error) throw new Error(`Vendor read failed (${error.code}). Confirm migrations and public grants are applied.`);
  if (!vendors?.length) throw new Error("Connected, but Aisyah Dessert fixture is missing. Apply the development seed.");
  const vendor = vendors[0];
  const checks = [
    client.from("categories").select("id,name").eq("id", vendor.category_id),
    client.from("subcategories").select("id,name").eq("id", vendor.subcategory_id ?? ""),
    client.from("states").select("id,name").eq("id", vendor.state_id),
    client.from("cities").select("id,name").eq("id", vendor.city_id),
    client.from("areas").select("id,name").eq("id", vendor.area_id ?? ""),
    client.from("products").select("id,name").eq("vendor_id", vendor.id),
    client.from("reviews").select("id,rating,review_text").eq("vendor_id", vendor.id),
    client.from("product_ratings").select("id,rating").eq("vendor_id", vendor.id),
    client.from("vendor_rating_summaries").select("vendor_id,review_count,average_rating").eq("vendor_id", vendor.id),
  ];
  const results = await Promise.all(checks);
  if (results.some(({ error }) => error)) throw new Error("A relationship or aggregate read failed; inspect database grants and migrations.");
  if (results.some(({ data }) => !data?.length)) throw new Error("A fixture relationship is missing.");
  console.log("PASS: public vendor, category, location, products, reviews, product ratings and aggregate reads.");
}

main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
