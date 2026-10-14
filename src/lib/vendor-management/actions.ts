"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { vendorClient, vendorSession, requireBusiness } from "@/lib/supabase/vendor";
import { field, identifier, profileInput, productInput } from "./validation";
import { uploadImage } from "./media-actions";

export type ActionResult = { message: string; ok?: boolean };
const fail = (error: unknown): ActionResult => ({ message: error instanceof Error ? error.message : "Please try again." });

export async function login(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const captchaToken = String(form.get("cf-turnstile-response") || "");
  if (!email || email.length > 254 || password.length > 128) return { message: "Check your email and password." };
  if (!captchaToken || captchaToken.length > 2048) return { message: "Complete the security check, then try again." };
  const client = await vendorClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password, options: { captchaToken } });
  if (error) {
    console.warn("Vendor sign-in failed", error.code || "auth_error");
    if (error.code === "captcha_failed") return { message: "The security check could not be verified. Refresh the page and try again." };
    return { message: "Unable to sign in. Check your email/password and confirm your email first." };
  }
  if (!data.user || data.user.is_anonymous) return { message: "Unable to sign in. Check your email/password and confirm your email first." };
  redirect("/dashboard");
}
export async function register(
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const captchaToken = String(form.get("cf-turnstile-response") || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { message: "Enter a valid email address." };
  }

  if (password.length < 12 || password.length > 128) {
    return { message: "Use a password between 12 and 128 characters." };
  }

  if (!captchaToken || captchaToken.length > 2048) {
    return { message: "Complete the Turnstile check, then try again." };
  }

  const client = await vendorClient();
  const h = await headers();
  const origin = h.get("origin");

  if (!origin) {
    return { message: "Please register from the Singgah page." };
  }

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      captchaToken,
    },
  });

  if (error) {
    console.warn("Vendor registration failed", error.code || "auth_error");

    if (error.code === "captcha_failed") {
      return { message: "The security check could not be verified. Refresh the page and try again." };
    }

    if (error.code === "over_email_send_rate_limit") {
      return {
        message: "Too many confirmation emails have been requested. Please try again later.",
      };
    }

    if (error.code === "email_address_invalid") {
      return {
        message: "That email address cannot receive a confirmation. Please use a real email address you control.",
      };
    }

    return {
      message: "Registration couldn’t be completed. Please try later or contact Singgah if confirmation email delivery is unavailable.",
    };
  }

  if (data.session && data.user?.email_confirmed_at) {
    redirect("/dashboard/onboarding");
  }

  return {
    ok: true,
    message: "Check your email to confirm your account, then sign in. If you already have an account, use the sign-in page.",
  };
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
  const file = form.get("file");
  const hasUpload = file instanceof File && file.size > 0;
  if (hasUpload && (file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
    return { message: "Choose a JPEG, PNG or WebP product photo no larger than 3 MB." };
  }
  if (productId) {
    const product = await client.from("products").select("id").eq("id", productId).eq("vendor_id", id).maybeSingle();
    if (product.error || !product.data) return { message: "This product is unavailable." };
  }
  if (!hasUpload) {
    if (!productId) return { message: "Add one photo for this product before saving." };
    const image = await client.from("vendor_images").select("id").eq("vendor_id", id).eq("product_id", productId).eq("image_type", "product").maybeSingle();
    if (image.error) return { message: "Unable to check the product photo. Please retry." };
    if (!image.data) return { message: "Add one photo for this product before saving." };
  }
  const isNew = !productId;
  if (isNew) {
    const created = await client.from("products").insert({ ...data, is_active: false, vendor_id: id }).select("id").single();
    if (created.error || !created.data) return { message: "Product could not be saved. Please retry." };
    productId = created.data.id;
  }
  if (hasUpload) {
    const imageForm = new FormData();
    imageForm.set("file", file);
    imageForm.set("kind", "product");
    imageForm.set("product_id", productId!);
    imageForm.set("alt", data.name);
    const uploaded = await uploadImage({ message: "" }, imageForm);
    if (!uploaded.ok) {
      if (isNew) await client.from("products").delete().eq("id", productId!).eq("vendor_id", id);
      return uploaded;
    }
  }
  const result = await client.from("products").update(data).eq("id", productId!).eq("vendor_id", id).select("id").maybeSingle();
  if (result.error || !result.data) {
    revalidatePath("/dashboard/products");
    return { message: "The photo was saved, but product details could not be saved. Open Products and edit this item to finish." };
  }
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
