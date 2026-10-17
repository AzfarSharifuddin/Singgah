import "server-only";
import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Deduplicated within one server render, including generateMetadata. No shared cache
// keeps suspended listings or signed media alive across requests.
export const getPublicVendor = cache(async (slug: string) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 180) return null;
  const client = createServerSupabaseClient();
  const { data, error } = await client.from("vendors").select(`
    id, name, slug, description, address, latitude, longitude, location_notes,
    phone, whatsapp, website_url, instagram_url, tiktok_url, facebook_url,
    category:categories!vendors_category_id_fkey(name),
    subcategory:subcategories!vendors_subcategory_id_category_id_fkey(name),
    state:states!vendors_state_id_fkey(name),
    city:cities!vendors_city_id_state_id_fkey(name),
    area:areas!vendors_area_id_city_id_fkey(name)
  `).eq("slug", slug).eq("status", "published").eq("is_active", true).maybeSingle();
  if (error) throw new Error("Unable to load vendor profile.");
  return data;
});

export type PublicVendor = NonNullable<Awaited<ReturnType<typeof getPublicVendor>>>;
export const REVIEWS_PER_PAGE = 10;

async function getProducts(client: ReturnType<typeof createServerSupabaseClient>, vendorId: string) {
  const products = await client.from("products").select("id,name,description,price,currency_code")
    .eq("vendor_id", vendorId).eq("is_active", true).order("display_order").order("id");
  if (products.error) throw new Error("Unable to load vendor details.");
  const ratings = products.data.length
    ? await client.from("product_rating_summaries").select("product_id,average_rating,rating_count")
        .in("product_id", products.data.map((product) => product.id))
    : { data: [], error: null };
  if (ratings.error) throw new Error("Unable to load product ratings.");
  const summaries = new Map(ratings.data?.map((rating) => [rating.product_id, rating]));
  return products.data.map((product) => ({ ...product, summary: summaries.get(product.id) ?? null }));
}

async function getImages(client: ReturnType<typeof createServerSupabaseClient>, vendorId: string) {
  const images = await client.from("vendor_images").select("id,product_id,storage_path,image_type,alt_text")
    .eq("vendor_id", vendorId).eq("is_public", true).order("display_order").order("id");
  if (images.error) throw new Error("Unable to load vendor details.");
  // No cross-request cache: every signing request must still pass public media
  // RLS. Product ratings and reviews need not finish before signing can start.
  const allowed = images.data.filter((image) => image.storage_path.startsWith(`vendors/${vendorId}/`));
  const signed = allowed.length
    ? await client.storage.from("vendor-media").createSignedUrls(allowed.map((image) => image.storage_path), 600)
    : null;
  const urls = new Map(signed?.data?.map((image) => [image.path, image.signedUrl]) ?? []);
  return images.data.map((image) => ({ ...image, url: urls.get(image.storage_path) ?? null }));
}

export async function getProfileContent(vendorId: string, reviewPage: number, sort: "newest" | "highest" | "lowest" = "newest") {
  const client = createServerSupabaseClient();
  let reviewQuery = client.from("reviews").select("id,rating,review_text,reviewer_name,created_at").eq("vendor_id", vendorId).eq("status", "published");
  if (sort !== "newest") reviewQuery = reviewQuery.order("rating", { ascending: sort === "lowest" });
  const [products, images, summary, reviews] = await Promise.all([
    getProducts(client, vendorId),
    getImages(client, vendorId),
    client.from("vendor_rating_summaries").select("average_rating,review_count,stars_1,stars_2,stars_3,stars_4,stars_5")
      .eq("vendor_id", vendorId).single(),
    reviewQuery
      .order("created_at", { ascending: false }).order("id")
      .range((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE - 1),
  ]);
  if (summary.error || reviews.error) {
    throw new Error("Unable to load vendor details.");
  }
  return {
    products,
    images,
    summary: summary.data,
    reviews: reviews.data,
  };
}

export type ProfileContent = Awaited<ReturnType<typeof getProfileContent>>;
