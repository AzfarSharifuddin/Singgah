import Link from "next/link";
import { AdminAuthForm } from "@/components/admin/auth-form";
import { requestAdminPasswordReset } from "@/lib/admin/actions";

export default function ForgotAdminPassword() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  return <div className="mx-auto max-w-md">
    <h1 className="font-serif text-4xl">Set or reset your admin password</h1>
    <p className="mb-7 mt-4 leading-7">Enter your admin email. If it has access, we’ll email a secure link to choose a new password.</p>
    {siteKey ? <AdminAuthForm action={requestAdminPasswordReset} mode="recovery" siteKey={siteKey} /> : <p role="alert" className="rounded-xl bg-rembulan/40 p-4">Password setup is temporarily unavailable because the security check is not configured.</p>}
    <p className="mt-6 text-sm"><Link href="/admin/login" className="underline underline-offset-4">Back to admin sign in</Link></p>
  </div>;
}
