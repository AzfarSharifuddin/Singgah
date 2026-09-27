import Link from "next/link";
import { PublicShell } from "@/components/discovery/public-shell";
import { AuthForm } from "@/components/vendor-management/forms";
import { register } from "@/lib/vendor-management/actions";
export const metadata = { title: "Become a vendor | Singgah", robots: { index: false } };
export default function Register() {
  return <PublicShell><main id="main" className="mx-auto max-w-lg px-5 py-12"><h1 className="font-serif text-4xl">Your business, your story.</h1><p className="mb-8 mt-3">Create an account to bring your local business to Singgah.</p><AuthForm action={register} registration /><p className="mt-6">Already registered? <Link className="inline-flex min-h-11 items-center underline" href="/vendor/login">Sign in</Link></p></main></PublicShell>;
}
