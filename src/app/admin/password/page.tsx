import { adminSession } from "@/lib/admin/session";
import { setAdminPassword, adminLogout } from "@/lib/admin/actions";
import { ActionForm } from "@/components/vendor-management/forms";
export default async function AdminPassword() {
  await adminSession();
  const input = "mt-2 min-h-12 w-full rounded-xl border border-hutan/25 bg-white px-3";
  return <div className="mx-auto max-w-md"><h1 className="font-serif text-4xl">Set your admin password</h1><p className="mb-7 mt-4 leading-7">Use at least 12 characters. This password lets you sign in after accepting your invitation.</p><ActionForm action={setAdminPassword} label="Save password"><label className="block">New password<input type="password" name="password" minLength={12} maxLength={128} autoComplete="new-password" required className={input} /></label><label className="block">Confirm password<input type="password" name="confirm_password" minLength={12} maxLength={128} autoComplete="new-password" required className={input} /></label></ActionForm><form action={adminLogout} className="mt-6"><button className="min-h-11 underline underline-offset-4">Sign out</button></form></div>;
}
