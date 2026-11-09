import Link from "next/link";
import { VendorAuthLayout } from "@/components/vendor-management/auth-layout";
import { AuthForm } from "@/components/vendor-management/forms";
import { login } from "@/lib/vendor-management/actions";
export const metadata = { title: "Vendor sign in | Singgah", robots: { index: false } };
export default async function Login({ searchParams }: { searchParams: Promise<{ confirmation?: string }> }) {
  const confirmation = (await searchParams).confirmation;
  return <VendorAuthLayout title="Welcome back." description="Sign in to manage your local business.">
    {confirmation && <p role="alert" className="mb-5 border-l-2 border-terracotta bg-rembulan/40 p-4 font-sans text-sm leading-7">That confirmation link could not be used. Try signing in if your email is already confirmed, or request a new registration email.</p>}
    <div className="editorial-auth"><AuthForm action={login} registration={false} /></div>
    <p className="mt-6 font-sans text-sm leading-7">New to Singgah? <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/vendor/register">Create a vendor account</Link></p>
  </VendorAuthLayout>;
}
