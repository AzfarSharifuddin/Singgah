import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { QueryData } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DISCOVERY_PAGE_SIZE, paginationWindow, searchExpression, type DiscoveryOptions, type DiscoveryFilters } from "./discovery-params";

// Only public reference data is shared across requests. Vendor visibility, ratings,
// signed media and account data deliberately stay outside this cache.
const cachedDiscoveryOptions = unstable_cache(async (): Promise<DiscoveryOptions> => {
  const client = createServerSupabaseClient();
  const [categories, subcategories, states, cities, areas] = await Promise.all([
    client.from("categories").select("id,name,slug").order("display_order").order("id"),
    client.from("subcategories").select("id,name,slug,category_id").order("display_order").order("id"),
    client.from("states").select("id,name,slug").order("name").order("id"),
    client.from("cities").select("id,name,slug,state_id").order("name").order("id"),
    client.from("areas").select("id,name,slug,city_id").order("name").order("id"),
  ]);
  if (categories.error || subcategories.error || states.error || cities.error || areas.error) throw new Error("Unable to load discovery filters.");
  return { categories: categories.data, subcategories: subcategories.data, states: states.data, cities: cities.data, areas: areas.data };
}, ["singgah-discovery-options-v1", process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""], {
  revalidate: 300,
  tags: ["discovery-options"],
});

export const getDiscoveryOptions = cache(cachedDiscoveryOptions);

function publicVendorQuery(count?: "exact") {
  const client = createServerSupabaseClient();
  return client.from("vendors").select(`
    id,name,slug,description,
    category:categories!vendors_category_id_fkey(name),
    subcategory:subcategories!vendors_subcategory_id_category_id_fkey(name),
    state:states!vendors_state_id_fkey(name),
    city:cities!vendors_city_id_state_id_fkey(name),
    area:areas!vendors_area_id_city_id_fkey(name)
  `, { count }).eq("status", "published").eq("is_active", true);
}

type VendorRow = QueryData<ReturnType<typeof publicVendorQuery>>[number];

async function withVendorCardDetails(vendors: VendorRow[]) {
  const client = createServerSupabaseClient();
  const ids = vendors.map((vendor) => vendor.id);
  const [summaries, logos] = vendors.length ? await Promise.all([
    client.from("vendor_rating_summaries").select("vendor_id,average_rating,review_count").in("vendor_id", ids),
    client.from("vendor_images").select("vendor_id,storage_path,alt_text")
      .in("vendor_id", ids).eq("image_type", "logo").eq("is_public", true),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (summaries.error) throw new Error("Unable to load vendor ratings.");
  const ratings = new Map(summaries.data?.map((rating) => [rating.vendor_id, rating]));
  // Sign only this result page's public logos, in one Storage request. No shared
  // URL cache: private bucket permissions and the existing ten-minute TTL remain.
  const allowed = (logos.error ? [] : logos.data ?? []).filter((logo) =>
    ids.includes(logo.vendor_id) && logo.storage_path.startsWith(`vendors/${logo.vendor_id}/`));
  const signed = allowed.length ? await client.storage.from("vendor-media")
    .createSignedUrls(allowed.map((logo) => logo.storage_path), 600) : null;
  const urls = new Map(signed?.data?.filter((image) => !image.error && image.path && image.signedUrl)
    .map((image) => [image.path, image.signedUrl]) ?? []);
  const images = new Map(allowed.map((logo) => [logo.vendor_id, logo]));
  return vendors.map((vendor) => {
    const image = images.get(vendor.id);
    const url = image ? urls.get(image.storage_path) : null;
    return { ...vendor, rating: ratings.get(vendor.id) ?? null, logo: url ? { url, alt: image?.alt_text || `${vendor.name} logo` } : null };
  });
}

// The homepage needs three cards, not a counted twelve-row discovery page.
export async function getLatestVendors() {
  const result = await publicVendorQuery().order("created_at", { ascending: false }).order("id").limit(3);
  if (result.error) throw new Error("Unable to find vendors.");
  return withVendorCardDetails(result.data);
}

export async function discoverVendors(filters: DiscoveryFilters, options: DiscoveryOptions) {
  let query = publicVendorQuery("exact");
  const category = options.categories.find((option) => option.slug === filters.category);
  const state = options.states.find((option) => option.slug === filters.state);
  const city = options.cities.find((option) => option.slug === filters.city && option.state_id === state?.id);
  const subcategory = options.subcategories.find((option) => option.slug === filters.subcategory && option.category_id === category?.id);
  const area = options.areas.find((option) => option.slug === filters.area && option.city_id === city?.id);
  if (category) query = query.eq("category_id", category.id);
  if (subcategory) query = query.eq("subcategory_id", subcategory.id);
  if (state) query = query.eq("state_id", state.id);
  if (city) query = query.eq("city_id", city.id);
  if (area) query = query.eq("area_id", area.id);
  if (filters.q) query = query.or(searchExpression(filters.q));
  query = filters.sort === "newest" ? query.order("created_at", { ascending: false }).order("id") : query.order("name").order("id");
  const { from, to } = paginationWindow(filters.page);
  let result = await query.range(from, to);
  // Recover an excessive offset so the route can redirect to a valid page.
  if (result.error?.code === "PGRST103") result = await query.range(0, DISCOVERY_PAGE_SIZE - 1);
  if (result.error) throw new Error("Unable to find vendors.");
  return {
    vendors: await withVendorCardDetails(result.data),
    count: result.count ?? 0,
    pages: Math.max(1, Math.ceil((result.count ?? 0) / DISCOVERY_PAGE_SIZE)),
  };
}
export type DiscoveryVendor = Awaited<ReturnType<typeof discoverVendors>>["vendors"][number];
