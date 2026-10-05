import Link from "next/link";
import { AdminAuthForm } from "@/components/admin/auth-form";
import { adminLogin } from "@/lib/admin/actions";
export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ access?: string; invitation?: string; password?: string }> }) {
  const params = await searchParams;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
  return <div className="mx-auto max-w-md"><h1 className="font-serif text-4xl">Admin sign in</h1><p className="mb-7 mt-4 leading-7">Manage vendors and review business applications. Use your invited admin account.</p>
    {params.access === "denied" && <p role="alert" className="mb-6 rounded-xl bg-rembulan/40 p-4">This account does not have admin access. Contact Singgah to check your invitation.</p>}
    {params.invitation === "retry" && <p role="alert" className="mb-6 rounded-xl bg-rembulan/40 p-4">The invitation could not be verified. Sign in if you already set a password, or request a fresh invitation.</p>}
    {params.password === "updated" && <p role="status" className="mb-6 rounded-xl bg-rembulan/40 p-4">Password saved. Sign in with your new password.</p>}
    {params.password === "retry" && <p role="alert" className="mb-6 rounded-xl bg-rembulan/40 p-4">The password setup link is invalid or expired. Request a fresh link below.</p>}
    {siteKey ? <AdminAuthForm action={adminLogin} mode="login" siteKey={siteKey} /> : <p role="alert" className="rounded-xl bg-rembulan/40 p-4">Admin sign in is temporarily unavailable because the security check is not configured.</p>}
    <p className="mt-6 text-sm"><Link href="/admin/forgot-password" className="underline underline-offset-4">Set or forgot your password?</Link></p>
  </div>;
}
