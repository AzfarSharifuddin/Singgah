import { ownProfile } from "@/lib/supabase/vendor";
import { getDiscoveryOptions } from "@/lib/vendors/discovery";
import { ProfileForm } from "@/components/vendor-management/forms";
import { saveProfile } from "@/lib/vendor-management/actions";
export default async function Profile() {
  const profile = await ownProfile();
  const initial = Object.fromEntries(Object.entries(profile).filter(([,value]) => typeof value === "string" || value === null)) as Record<string,string|null>;
  return <><h1 className="mb-8 font-serif text-4xl">Business profile</h1><div className="rounded-2xl border border-hutan/15 bg-white p-5 sm:p-8"><ProfileForm action={saveProfile} options={await getDiscoveryOptions()} initial={initial} /></div></>;
}
