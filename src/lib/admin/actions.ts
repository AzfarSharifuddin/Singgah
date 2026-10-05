"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vendorClient } from "@/lib/supabase/vendor";
import { adminSession } from "./session";
import { adminLoginInput, adminPasswordInput, adminRecoveryInput, moderationInput } from "./validation";
import type { ActionResult } from "@/lib/vendor-management/actions";

const ADMIN_RECOVERY_REDIRECT = "https://singgah.cc/admin/recovery";

export async function adminLogin(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  let input;
  try { input = adminLoginInput(form); } catch (error) { return { message: error instanceof Error ? error.message : "Check your email and password." }; }
  const client = await vendorClient();
  const { data, error } = await client.auth.signInWithPassword({ email: input.email, password: input.password, options: { captchaToken: input.captchaToken } });
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
  let password;
  try { password = adminPasswordInput(form); } catch (error) { return { message: error instanceof Error ? error.message : "Check your password." }; }
  const { error } = await client.auth.updateUser({ password });
  if (error) return { message: "Password could not be saved. Retry, or request a fresh invitation." };
  const { error: signOutError } = await client.auth.signOut({ scope: "local" });
  if (signOutError) return { ok: true, message: "Password saved, but automatic sign out failed. Use the sign out button, then sign in with your new password." };
  redirect("/admin/login?password=updated");
}

export async function requestAdminPasswordReset(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  let input;
  try { input = adminRecoveryInput(form); } catch (error) { return { message: error instanceof Error ? error.message : "Complete the security check and try again." }; }
  if (input.email) {
    const client = await vendorClient();
    // Keep the response identical so callers cannot discover Auth accounts or admin membership.
    await client.auth.resetPasswordForEmail(input.email, { redirectTo: ADMIN_RECOVERY_REDIRECT, captchaToken: input.captchaToken });
  }
  return { ok: true, message: "If this email belongs to a Singgah admin, a password setup link has been sent. Check the inbox and spam folder." };
}
