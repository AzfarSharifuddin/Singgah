import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "./config";

export async function vendorClient() {
  const jar = await cookies();
  const { url, key } = getSupabaseConfig();
  return createServerClient<Database>(url, key, {
    cookieOptions: { name: "singgah-vendor", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => { try { items.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Read-only Server Component; proxy handles refresh. */ } },
    },
  });
}

export const vendorSession = cache(async () => {
  const client = await vendorClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || user.is_anonymous || !user.email_confirmed_at) redirect("/vendor/login");
  const { data: id, error } = await client.rpc("current_vendor_id");
  if (error) throw new Error("Unable to load your business.");
  return { client, user, id };
});

export async function requireBusiness() {
  const session = await vendorSession();
  if (!session.id) redirect("/dashboard/onboarding");
  return { ...session, id: session.id };
}

export const ownProfile = cache(async () => {
  const { client, id } = await requireBusiness();
  const { data, error } = await client.from("vendors").select("id,name,slug,description,category_id,subcategory_id,state_id,city_id,area_id,address,phone,whatsapp,website_url,instagram_url,tiktok_url,facebook_url,status,is_active").eq("id", id).single();
  if (error) throw new Error("Unable to load your profile.");
  return data;
});
