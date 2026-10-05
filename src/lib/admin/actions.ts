"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vendorClient } from "@/lib/supabase/vendor";
import { adminSession } from "./session";
import { moderationInput } from "./validation";
import type { ActionResult } from "@/lib/vendor-management/actions";

export async function adminLogin(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  if (!email || email.length > 254 || !password || password.length > 128) return { message: "Check your email and password." };
  const client = await vendorClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at) return { message: "Unable to sign in. Check your credentials and confirm your email." };
  const permission = await client.rpc("is_singgah_admin");
  if (permission.error || !permission.data) {
    await client.auth.signOut({ scope: "local" });
    return { message: "This account does not have admin access, or access could not be checked. Contact Singgah." };
  }
  redirect("/admin");
}
export async function adminLogout() {
  const client = await vendorClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw new Error("Unable to sign out. Please retry.");
  redirect("/admin/login");
}
export async function moderateVendor(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { client } = await adminSession();
  let input;
  try { input = moderationInput(form); } catch (error) { return { message: error instanceof Error ? error.message : "Check your decision." }; }
  const { error } = await client.rpc("admin_moderate_vendor", input);
  if (error) return { message: error.code === "40001" ? "Another admin changed this vendor. Refresh before reviewing again." : "Decision could not be saved. Refresh and retry." };
  revalidatePath("/admin"); revalidatePath("/"); revalidatePath("/discover"); revalidatePath("/vendor/[slug]", "page"); revalidatePath("/dashboard", "layout");
  return { ok: true, message: input.p_decision === "approve" ? "Vendor approved. Active profiles are now public." : "Vendor rejected and hidden from public discovery." };
}
export async function setAdminPassword(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { client } = await adminSession();
  const password = String(form.get("password") || "");
  if (password.length < 12 || password.length > 128) return { message: "Use a password between 12 and 128 characters." };
  if (password !== String(form.get("confirm_password") || "")) return { message: "The passwords do not match." };
  const { error } = await client.auth.updateUser({ password });
  if (error) return { message: "Password could not be saved. Retry, or request a fresh invitation." };
  redirect("/admin");
}
