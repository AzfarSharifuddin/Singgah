import { redirect } from "next/navigation";
import { vendorSession } from "@/lib/supabase/vendor";
import { getDiscoveryOptions } from "@/lib/vendors/discovery";
import { ProfileForm } from "@/components/vendor-management/forms";
import { saveProfile } from "@/lib/vendor-management/actions";
export default async function Onboarding() {
  const { id } = await vendorSession(); if (id) redirect("/dashboard");
  return <><h1 className="font-serif text-4xl">Let’s meet your business.</h1><p className="mb-8 mt-3">A few details to help people discover your story.</p><div className="rounded-2xl border border-hutan/15 bg-white p-5 sm:p-8"><ProfileForm action={saveProfile} options={await getDiscoveryOptions()} onboarding /></div></>;
}
