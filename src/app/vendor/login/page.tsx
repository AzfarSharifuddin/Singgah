import Link from "next/link";
import { PublicShell } from "@/components/discovery/public-shell";
import { AuthForm } from "@/components/vendor-management/forms";
import { login } from "@/lib/vendor-management/actions";
export const metadata = { title: "Vendor sign in | Singgah", robots: { index: false } };
export default async function Login({ searchParams }: { searchParams: Promise<{ confirmation?: string }> }) {
  const confirmation = (await searchParams).confirmation;
  return <PublicShell><main id="main" className="mx-auto max-w-lg px-5 py-12"><h1 className="font-serif text-4xl">Welcome back.</h1><p className="mb-8 mt-3">Sign in to manage your local business.</p>{confirmation && <p role="alert" className="mb-5 rounded-xl bg-rembulan/40 p-4">That confirmation link could not be used. Try signing in if your email is already confirmed, or request a new registration email.</p>}<AuthForm action={login} registration={false} /><p className="mt-6">New to Singgah? <Link className="inline-flex min-h-11 items-center underline" href="/vendor/register">Create a vendor account</Link></p></main></PublicShell>;
}
