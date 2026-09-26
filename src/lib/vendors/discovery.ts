import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DISCOVERY_PAGE_SIZE, paginationWindow, searchExpression, type DiscoveryOptions, type DiscoveryFilters } from "./discovery-params";

export const getDiscoveryOptions = cache(async (): Promise<DiscoveryOptions> => {
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
});

export async function discoverVendors(filters: DiscoveryFilters, options: DiscoveryOptions) {
  const client = createServerSupabaseClient();
  let query = client.from("vendors").select(`
    id,name,slug,description,
    category:categories!vendors_category_id_fkey(name),
    subcategory:subcategories!vendors_subcategory_id_category_id_fkey(name),
    state:states!vendors_state_id_fkey(name),
    city:cities!vendors_city_id_state_id_fkey(name),
    area:areas!vendors_area_id_city_id_fkey(name)
  `, { count: "exact" }).eq("status", "published").eq("is_active", true);
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
  const vendors = result.data;
  const summaries = vendors.length ? await client.from("vendor_rating_summaries")
    .select("vendor_id,average_rating,review_count").in("vendor_id", vendors.map((vendor) => vendor.id)) : { data: [], error: null };
  if (summaries.error) throw new Error("Unable to load vendor ratings.");
  const ratings = new Map(summaries.data?.map((rating) => [rating.vendor_id, rating]));
  return {
    vendors: vendors.map((vendor) => ({ ...vendor, rating: ratings.get(vendor.id) ?? null })),
    count: result.count ?? 0,
    pages: Math.max(1, Math.ceil((result.count ?? 0) / DISCOVERY_PAGE_SIZE)),
  };
}
export type DiscoveryVendor = Awaited<ReturnType<typeof discoverVendors>>["vendors"][number];
