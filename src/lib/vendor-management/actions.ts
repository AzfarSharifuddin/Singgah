"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { vendorClient, vendorSession, requireBusiness } from "@/lib/supabase/vendor";
import { field, identifier, profileInput, productInput } from "./validation";

export type ActionResult = { message: string; ok?: boolean };
const fail = (error: unknown): ActionResult => ({ message: error instanceof Error ? error.message : "Please try again." });

export async function login(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const client = await vendorClient();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!email || email.length > 254 || password.length > 128) return { message: "Check your email and password." };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || data.user.is_anonymous) return { message: "Unable to sign in. Check your email/password and confirm your email first." };
  redirect("/dashboard");
}
export async function register(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { message: "Enter a valid email address." };
  if (password.length < 12 || password.length > 128) return { message: "Use a password between 12 and 128 characters." };
  const client = await vendorClient();
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return { message: "Please register from the Singgah page." };
  const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } });
  if (error) {
    console.warn("Vendor registration failed", error.code || "auth_error");
    if (error.code === "over_email_send_rate_limit") return { message: "Too many confirmation emails have been requested. Please try again later." };
    if (error.code === "email_address_invalid") return { message: "That email address cannot receive a confirmation. Please use a real email address you control." };
    return { message: "Registration couldn’t be completed. Please try later or contact Singgah if confirmation email delivery is unavailable." };
  }
  if (data.session && data.user?.email_confirmed_at) redirect("/dashboard/onboarding");
  return { ok: true, message: "Check your email to confirm your account, then sign in. If you already have an account, use the sign-in page." };
}
export async function logout() {
  const client = await vendorClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw new Error("Unable to sign out. Please retry.");
  redirect("/vendor/login");
}
export async function saveProfile(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { client, id } = await vendorSession();
  let data;
  try { data = profileInput(form); } catch (error) { return fail(error); }
  if (!id) {
    const result = await client.rpc("create_vendor_business", { p_profile: data });
    if (result.error) return { message: "Unable to create your business. Check the category and location selections, then retry." };
    redirect("/dashboard/photos?onboarding=complete");
  }
  const { error } = await client.from("vendors").update(data).eq("id", id);
  if (error) return { message: "Unable to save. Check the category and location selections, then retry." };
  revalidatePath("/dashboard", "layout"); revalidatePath("/vendor/[slug]", "page"); revalidatePath("/discover");
  return { ok: true, message: "Business profile saved. Your public URL has not changed." };
}
export async function saveProduct(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { client, id } = await requireBusiness();
  let data, productId;
  try { data = productInput(form); productId = identifier(form, "id", false); } catch (error) { return fail(error); }
  const result = productId
    ? await client.from("products").update(data).eq("id", productId).eq("vendor_id", id).select("id").maybeSingle()
    : await client.from("products").insert({ ...data, vendor_id: id }).select("id").single();
  if (result.error || !result.data) return { message: "Product could not be saved. Please retry." };
  revalidatePath("/dashboard/products"); revalidatePath("/vendor/[slug]", "page");
  redirect("/dashboard/products?saved=1");
}
export async function deactivateProduct(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { client, id } = await requireBusiness();
  let productId;
  try { productId = field(form, "id", 36, true); } catch (error) { return fail(error); }
  const { data, error } = await client.from("products").update({ is_active: false }).eq("id", productId!).eq("vendor_id", id).select("id").maybeSingle();
  if (error || !data) return { message: "Product could not be deactivated." };
  revalidatePath("/dashboard/products"); revalidatePath("/vendor/[slug]", "page");
  return { ok: true, message: "Product deactivated. Existing ratings are retained." };
}
