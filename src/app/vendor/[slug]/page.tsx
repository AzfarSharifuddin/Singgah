import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPublicVendor, getProfileContent, type PublicVendor } from "@/lib/vendors/profile";
import { locationSummary, reviewPageNumber } from "@/lib/vendors/format";
import { ProfileImage } from "@/components/vendor/profile-image";
import { ContactActions } from "@/components/vendor/contact-actions";
import { ProductCard } from "@/components/vendor/product-card";
import { VendorReviews } from "@/components/vendor/reviews";
import { RatingStars } from "@/components/vendor/rating-stars";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ reviews?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const vendor = await getPublicVendor((await params).slug);
  if (!vendor) notFound();
  const place = vendor.area?.name || vendor.city.name;
  const title = `${vendor.name} — ${place} | Singgah`;
  const description = (vendor.description?.trim() || `Meet ${vendor.name}, a ${vendor.subcategory?.name || vendor.category.name} vendor in ${locationSummary(place, vendor.state.name)}.`).replace(/\s+/g, " ").slice(0, 160);
  return {
    title, description, robots: { index: true, follow: true },
    openGraph: { title, description, type: "website", siteName: "Singgah", locale: "en_MY" },
  };
}

async function ProfileDetails({ vendor, reviewPage }: { vendor: PublicVendor; reviewPage: number }) {
  const { products, images, summary, reviews } = await getProfileContent(vendor.id, reviewPage);
  const cover = images.find((image) => image.image_type === "cover");
  const logo = images.find((image) => image.image_type === "logo");
  const gallery = images.filter((image) => image.image_type === "gallery");
  const locality = locationSummary(vendor.area?.name, vendor.city.name);
  const initials = vendor.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  const mapUrl = vendor.latitude !== null && vendor.longitude !== null
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vendor.latitude},${vendor.longitude}`)}` : null;

  return <>
    <section aria-label="Vendor identity" className="overflow-hidden rounded-3xl border border-hutan/10 bg-white">
      {cover?.url ? <ProfileImage src={cover.url} alt={cover.alt_text || `${vendor.name} cover photo`} className="h-44 sm:h-60" sizes="(max-width: 1152px) 100vw, 1152px" priority /> :
        <div className="profile-cover relative flex h-44 items-center justify-center overflow-hidden bg-hutan px-6 text-rembulan sm:h-60">
          <div aria-hidden="true" className="absolute -right-8 -bottom-24 size-72 rounded-full border border-rembulan/20 sm:right-16 sm:size-96" />
          <div aria-hidden="true" className="absolute -right-1 -bottom-20 size-56 rounded-full border border-rembulan/20 sm:right-24 sm:size-80" />
          <div className="relative text-center"><p className="text-[10px] uppercase tracking-[0.3em] text-rembulan/80">Small places. Meaningful stories.</p><p className="mt-3 font-serif text-2xl sm:text-4xl">A little closer to local.</p></div>
          <span className="absolute bottom-4 right-5 text-[10px] text-rembulan/70">Cover photo coming soon</span>
        </div>}
      <div className="relative px-6 pb-7 sm:px-9 sm:pb-9">
        <div className="-mt-9 mb-5 w-fit rounded-2xl border-4 border-white bg-white shadow-sm"><ProfileImage src={logo?.url ?? null} alt={`${vendor.name} logo`} initials={initials} className="size-20 rounded-xl sm:size-24" sizes="96px" /></div>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#86513a]">{vendor.category.name}{vendor.subcategory && ` · ${vendor.subcategory.name}`}</p><h1 className="mt-3 font-serif text-3xl leading-tight sm:text-5xl">{vendor.name}</h1><p className="mt-3 text-sm text-[#5d665f]">{locality} <span aria-hidden="true">·</span> {vendor.state.name}</p></div>
          <a href="#reviews" className="inline-flex min-h-11 flex-wrap items-center gap-2 rounded-xl bg-[#f5f1e9] px-4 py-3 text-sm" aria-label={summary.review_count ? `${summary.average_rating?.toFixed(1)} out of 5 from ${summary.review_count} reviews. Read reviews.` : "No reviews yet. Go to reviews."}>
            {summary.average_rating !== null && summary.review_count > 0 ? <><span className="text-xl font-semibold">{summary.average_rating.toFixed(1)}</span><RatingStars rating={summary.average_rating} /><span className="text-[#5d665f]">({summary.review_count})</span></> : <span>No reviews yet</span>}
          </a>
        </div>
        <div className="mt-6"><ContactActions vendor={vendor} /></div>
      </div>
    </section>

    <nav aria-label="On this page" className="my-7 flex flex-wrap gap-x-6 border-b border-hutan/15 text-sm sm:gap-x-9">
      {[['about','The story'],['products','Products'],['photos','Photos'],['reviews','Reviews'],['location','Find them']].map(([id,label]) => <a className="inline-flex min-h-12 items-center border-b-2 border-transparent hover:border-terracotta" href={`#${id}`} key={id}>{label}</a>)}
    </nav>
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
      <div className="min-w-0 space-y-10">
        <section id="about" aria-labelledby="about-heading" className="scroll-mt-8"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#86513a]">Behind the name</p><h2 id="about-heading" className="font-serif text-3xl">A local story</h2><p className="mt-4 whitespace-pre-line leading-7 text-[#46534a]">{vendor.description?.trim() || "This vendor hasn’t shared their story yet. Get to know them through their products and community reviews."}</p><p className="mt-4 text-sm text-[#5d665f]">Based in {locationSummary(vendor.area?.name, vendor.city.name, vendor.state.name)}.</p></section>
        <section id="products" aria-labelledby="products-heading" className="scroll-mt-8 border-t border-hutan/10 pt-9"><div className="flex items-baseline justify-between gap-4"><h2 id="products-heading" className="font-serif text-3xl">On offer</h2><span className="text-xs text-[#5d665f]">{products.length} {products.length === 1 ? "item" : "items"}</span></div>
          {products.length ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} image={images.find((image) => image.image_type === "product" && image.product_id === product.id)} />)}</div> : <p className="mt-5 rounded-2xl border border-dashed border-hutan/20 p-6 text-sm text-[#5d665f]">No products listed yet.</p>}
        </section>
        <section id="photos" aria-labelledby="photos-heading" className="scroll-mt-8 border-t border-hutan/10 pt-9"><h2 id="photos-heading" className="font-serif text-3xl">A closer look</h2>
          {gallery.length ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{gallery.map((image) => <ProfileImage key={image.id} src={image.url} alt={image.alt_text || `${vendor.name} business photo`} className="aspect-square rounded-xl" sizes="(max-width: 639px) 45vw, 240px" />)}</div> : <div className="mt-5 flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-hutan/20 bg-[#f5f1e9] px-6 text-center"><p className="text-sm leading-6 text-[#5d665f]">No gallery photos yet.<br /><span className="text-xs">A glimpse of this place is coming soon.</span></p></div>}
        </section>
        <VendorReviews summary={summary} reviews={reviews} slug={vendor.slug} page={reviewPage} />
      </div>
      <aside className="space-y-5 lg:sticky lg:top-6">
        <section id="location" aria-labelledby="location-heading" className="scroll-mt-8 rounded-2xl border border-hutan/15 bg-white p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#86513a]">In the neighbourhood</p><h2 id="location-heading" className="mt-3 font-serif text-2xl">Find them here</h2>
          <div className="my-5 flex size-11 items-center justify-center rounded-full bg-[#f1ece2]" aria-hidden="true"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg></div>
          <address className="not-italic text-sm leading-7">{vendor.address && <p className="mb-2">{vendor.address}</p>}<p className="font-semibold">{locality}</p><p>{vendor.state.name}, Malaysia</p></address>
          {!vendor.address && <p className="mt-3 text-xs leading-5 text-[#5d665f]">A street address hasn’t been added yet.</p>}
          {vendor.location_notes && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#5d665f]">{vendor.location_notes}</p>}
          {mapUrl && <a className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4" href={mapUrl} rel="noopener noreferrer">Open in Google Maps <span aria-hidden="true" className="ml-2">↗</span></a>}
        </section>
        <section aria-labelledby="share-heading" className="rounded-2xl bg-hutan p-6 text-white"><span aria-hidden="true" className="text-2xl text-rembulan">✳</span><h2 id="share-heading" className="mt-3 font-serif text-2xl">Been here? Tell the story.</h2><p className="mt-3 text-sm leading-6 text-rembulan">Your experience can help someone find their next local favourite.</p><button disabled aria-describedby="review-availability" className="mt-5 min-h-12 w-full cursor-not-allowed rounded-xl bg-rembulan px-4 text-sm font-semibold text-hutan">Leave a Review</button><p id="review-availability" className="mt-3 text-center text-xs text-rembulan">Review submissions are coming soon.</p></section>
      </aside>
    </div>
  </>;
}

export default async function VendorPage({ params, searchParams }: Props) {
  const vendor = await getPublicVendor((await params).slug);
  if (!vendor) notFound();
  const reviewPage = reviewPageNumber((await searchParams).reviews);
  return <div className="min-h-svh bg-[#faf8f3] text-hutan [overflow-wrap:anywhere]">
    <a href="#vendor-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded focus:bg-white focus:p-4">Skip to vendor profile</a>
    <header className="border-b border-hutan/10"><div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-5 sm:px-8"><Link href="/" aria-label="Singgah home" className="inline-flex min-h-11 items-center text-xl font-bold tracking-[0.16em]">SINGGAH<span aria-hidden="true" className="ml-1 text-terracotta">.</span></Link><p className="hidden text-xs text-[#5d665f] sm:block">Stories Make Places Brighter</p><span className="text-[10px] uppercase tracking-[0.16em] sm:hidden">Made of local stories</span></div></header>
    <main id="vendor-content" className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-9">
      <Suspense fallback={<div role="status" className="rounded-3xl border border-hutan/10 bg-white p-10"><h1 className="font-serif text-3xl">{vendor.name}</h1><p className="mt-4 text-sm">Loading this local story…</p></div>}><ProfileDetails vendor={vendor} reviewPage={reviewPage} /></Suspense>
    </main>
    <footer className="border-t border-hutan/10 px-5 py-8 text-center text-xs text-[#5d665f]">Singgah <span aria-hidden="true">·</span> Stories Make Places Brighter</footer>
  </div>;
}
