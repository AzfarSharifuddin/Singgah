import { notFound } from "next/navigation";
import Link from "next/link";
import { PublicShell } from "@/components/discovery/public-shell";
import { ReviewForm } from "@/components/reviews/review-form";
import { getPublicVendor } from "@/lib/vendors/profile";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reviewProtection } from "@/lib/reviews/protection";

export const dynamic = "force-dynamic";
export const metadata = { title: "Share your experience | Singgah", robots: { index: false, follow: true } };

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const vendor = await getPublicVendor((await params).slug);
  if (!vendor) notFound();
  const { data: products, error } = await createServerSupabaseClient().from("products").select("id,name").eq("vendor_id", vendor.id).eq("is_active", true).order("display_order").order("id");
  if (error) throw new Error("Unable to load review products.");
  const protection = reviewProtection();
  return <PublicShell><main id="main" className="mx-auto max-w-2xl px-5 py-8 sm:py-12"><Link href={`/vendor/${vendor.slug}`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">← {vendor.name}</Link><p className="mt-5 text-xs font-semibold uppercase tracking-widest text-[#86513a]">A little kindness goes a long way</p><h1 className="mt-3 font-serif text-4xl">How was your experience?</h1><p className="mb-8 mt-3 text-[#5d665f]">Share your visit to {vendor.name}.</p>{protection ? <ReviewForm vendorId={vendor.id} slug={vendor.slug} products={products || []} siteKey={protection.siteKey} /> : <p role="status" className="rounded-2xl border border-hutan/15 bg-white p-6">Review submissions are temporarily unavailable. Please check back soon.</p>}</main></PublicShell>;
}
