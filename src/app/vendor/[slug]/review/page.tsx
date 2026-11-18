import { notFound } from "next/navigation";
import Link from "next/link";
import { EditorialShell } from "@/components/brand/editorial-shell";
import { ProfileImage } from "@/components/vendor/profile-image";
import { ReviewForm } from "@/components/reviews/review-form";
import { getPublicVendor, getVendorIdentityImages } from "@/lib/vendors/profile";
import { locationSummary } from "@/lib/vendors/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reviewProtection } from "@/lib/reviews/protection";
import { vendorClient } from "@/lib/supabase/vendor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Share your experience | Singgah", robots: { index: false, follow: true } };

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const vendor = await getPublicVendor((await params).slug);
  if (!vendor) notFound();
  const auth = await vendorClient();
  const { data: { user: vendorUser } } = await auth.auth.getUser();
  if (vendorUser && !vendorUser.is_anonymous) return <EditorialShell focused><main id="main" className="mx-auto max-w-2xl px-6 py-12 font-sans"><h1 className="font-serif text-4xl">You’re signed in as a vendor.</h1><p className="my-5 leading-7">Customer reviews use a separate anonymous session. Sign out of your vendor account before leaving a customer review. Your existing customer session will be kept.</p><Link href="/dashboard" className="editorial-action inline-flex min-h-12 items-center rounded-sm bg-hutan px-5 text-white">Go to dashboard</Link></main></EditorialShell>;
  const [{ data: products, error }, images] = await Promise.all([
    createServerSupabaseClient().from("products").select("id,name").eq("vendor_id", vendor.id).eq("is_active", true).order("display_order").order("id"),
    getVendorIdentityImages(vendor.id),
  ]);
  if (error) throw new Error("Unable to load review products.");
  const protection = reviewProtection();
  const cover = images.find((image) => image.image_type === "cover");
  const logo = images.find((image) => image.image_type === "logo");
  const initials = vendor.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  return <EditorialShell focused>
    <main id="main" className="mx-auto w-full max-w-4xl px-5 py-6 font-sans sm:px-8 sm:py-9">
      <div className="overflow-hidden rounded-xl border border-hutan/15 bg-[#fffdf8]">
        <div aria-label={`${vendor.name} business identity`} className="relative flex h-40 items-end bg-hutan p-5 text-[#fffdf8] sm:h-48 sm:p-7">
          {cover?.url && <div className="absolute inset-0"><ProfileImage src={cover.url} alt={cover.alt_text || `${vendor.name} cover photo`} className="h-full w-full" sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 895px) calc(100vw - 64px), 832px" priority /></div>}
          <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/70 via-black/35 to-black/25" />
          <div className="relative flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-lg border-2 border-[#fffdf8] bg-[#fffdf8]"><ProfileImage src={logo?.url ?? null} alt={`${vendor.name} logo`} initials={initials} fit="contain" className="size-12 rounded-md" sizes="48px" /></div>
            <div className="min-w-0"><p className="font-serif text-3xl leading-tight sm:text-4xl">{vendor.name}</p><p className="mt-1 text-sm">{locationSummary(vendor.area?.name, vendor.city.name, vendor.state.name)}, Malaysia</p></div>
          </div>
        </div>
        <div className="mx-auto max-w-xl px-5 py-6 sm:px-8 sm:py-8">
          <Link href={`/vendor/${vendor.slug}`} className="editorial-action mb-3 inline-flex min-h-11 items-center text-xs underline underline-offset-4">Back to {vendor.name}</Link>
          <h1 className="mb-6 font-serif text-4xl leading-[1.1] sm:text-[2.75rem]">How was your experience?</h1>
          {protection ? <ReviewForm vendorId={vendor.id} slug={vendor.slug} products={products || []} siteKey={protection.siteKey} /> : <p role="status" className="py-6 text-sm leading-7">Review submissions are temporarily unavailable. Please check back soon.</p>}
        </div>
      </div>
    </main>
  </EditorialShell>;
}
