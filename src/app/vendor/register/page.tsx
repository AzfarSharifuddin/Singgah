import Link from "next/link";
import { VendorAuthLayout } from "@/components/vendor-management/auth-layout";
import { AuthForm } from "@/components/vendor-management/forms";
import { register } from "@/lib/vendor-management/actions";
export const metadata = { title: "Become a vendor | Singgah", robots: { index: false } };
export default function Register() {
  return <VendorAuthLayout title="Your business, your story." description="Create an account to bring your local business to Singgah.">
    <div className="editorial-auth"><AuthForm action={register} registration /></div>
    <p className="mt-6 font-sans text-sm leading-7">Already registered? <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/vendor/login">Sign in</Link></p>
  </VendorAuthLayout>;
}
