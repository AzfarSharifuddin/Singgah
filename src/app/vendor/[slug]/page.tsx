import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditorialShell } from "@/components/brand/editorial-shell";
import { getPublicVendor, getProfileContent, type PublicVendor } from "@/lib/vendors/profile";
import { locationSummary, reviewPageNumber } from "@/lib/vendors/format";
import { ProfileImage } from "@/components/vendor/profile-image";
import { ContactActions } from "@/components/vendor/contact-actions";
import { ProductCard } from "@/components/vendor/product-card";
import { VendorReviews } from "@/components/vendor/reviews";
import { RatingStars } from "@/components/vendor/rating-stars";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ reviews?: string | string[]; reviewSort?: string | string[] }> };
const contentWidth = "mx-auto w-full max-w-6xl px-6 sm:px-8";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const vendor = await getPublicVendor((await params).slug);
  if (!vendor) notFound();
  const place = vendor.area?.name || vendor.city.name;
  const title = `${vendor.name} — ${place} | Singgah`;
  const description = (vendor.description?.trim() || `Meet ${vendor.name}, a ${vendor.subcategory?.name || vendor.category.name} vendor in ${locationSummary(place, vendor.state.name)}.`).replace(/\s+/g, " ").slice(0, 160);
  return {
    title, description, robots: { index: true, follow: true },
    alternates: { canonical: `/vendor/${encodeURIComponent(vendor.slug)}` },
    openGraph: { title, description, url: `/vendor/${encodeURIComponent(vendor.slug)}`, type: "website", siteName: "Singgah", locale: "en_MY" },
  };
}

async function ProfileDetails({ vendor, reviewPage, sort }: { vendor: PublicVendor; reviewPage: number; sort: "newest" | "highest" | "lowest" }) {
  const { products, images, summary, reviews } = await getProfileContent(vendor.id, reviewPage, sort);
  const cover = images.find((image) => image.image_type === "cover");
  const logo = images.find((image) => image.image_type === "logo");
  const gallery = images.filter((image) => image.image_type === "gallery");
  const locality = locationSummary(vendor.area?.name, vendor.city.name, vendor.state.name);
  const initials = vendor.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  const mapUrl = vendor.latitude !== null && vendor.longitude !== null
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vendor.latitude},${vendor.longitude}`)}` : null;
  const imageByProduct = new Map(images.filter((image) => image.image_type === "product").map((image) => [image.product_id, image]));

  return <>
    <div className={`${contentWidth} pt-6 sm:pt-9`}>
      <section aria-label="Vendor identity" className="overflow-hidden rounded-2xl border border-hutan/10 bg-[#fffdf8]">
      {cover?.url
        ? <ProfileImage src={cover.url} alt={cover.alt_text || `${vendor.name} cover photo`} className="h-44 sm:h-[260px]" sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1151px) calc(100vw - 64px), 1088px" priority />
        : <div aria-hidden="true" className="h-24 border-b border-hutan/10 bg-[#f1e7d6] sm:h-40" />}
      <div className="relative flow-root px-5 pb-7 sm:px-8 sm:pb-8">
        <div className="relative -mt-8 mb-5 w-fit rounded-2xl border-4 border-[#fffdf8] bg-[#fffdf8] sm:-mt-10">
          <ProfileImage src={logo?.url ?? null} alt={`${vendor.name} logo`} initials={initials} fit="contain" className="size-20 rounded-xl sm:size-24" sizes="96px" />
        </div>
          <div className="min-w-0">
            <p className="text-sm leading-6 text-[#526056]">{vendor.category.name}{vendor.subcategory && ` · ${vendor.subcategory.name}`}</p>
            <h1 className="mt-2 font-serif text-5xl leading-[1.05] sm:text-6xl">{vendor.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
              <p className="text-[#526056]">{locality}, Malaysia</p>
              <a href="#reviews" className="inline-flex min-h-11 flex-wrap items-center gap-2 underline-offset-4 hover:underline"
                aria-label={summary.review_count ? `${summary.average_rating?.toFixed(1)} out of 5 from ${summary.review_count} reviews. Read reviews.` : "No reviews yet. Go to reviews."}>
                {summary.average_rating !== null && summary.review_count > 0
                  ? <><RatingStars rating={summary.average_rating} /><span>{summary.average_rating.toFixed(1)} <span className="text-[#526056]">· {summary.review_count} {summary.review_count === 1 ? "review" : "reviews"}</span></span></>
                  : "No reviews yet"}
              </a>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <ContactActions vendor={vendor} />
            <Link href={`/vendor/${vendor.slug}/review`} className="editorial-action inline-flex min-h-12 items-center justify-center rounded-sm bg-hutan px-6 py-3 text-sm text-[#fffdf8] hover:bg-[#284f3d] sm:ml-auto sm:shrink-0">Leave a Review</Link>
          </div>
      </div>
      </section>
        <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-x-6 border-b border-hutan/15 py-2 text-sm sm:gap-x-9">
          <a className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href="#about">About</a>
          <a className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href="#products">Products</a>
          {gallery.length > 0 && <a className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href="#photos">Photos</a>}
          <a className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href="#reviews">Reviews</a>
          <a className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href="#location">Location</a>
        </nav>
    </div>

    <section id="about" aria-labelledby="about-heading" className={`${contentWidth} grid scroll-mt-6 gap-6 py-12 sm:py-16 lg:grid-cols-[1fr_1.4fr] lg:gap-16`}>
      <h2 id="about-heading" className="font-serif text-4xl sm:text-5xl">About</h2>
      <p className="max-w-prose whitespace-pre-line text-base leading-8 text-[#526056]">{vendor.description?.trim() || "This vendor hasn’t shared their story yet. Get to know them through their products and community reviews."}</p>
    </section>

    <section id="products" aria-labelledby="products-heading" className="scroll-mt-6 bg-[#f5f0e7] py-12 sm:py-16">
      <div className={contentWidth}>
        <h2 id="products-heading" className="mb-7 font-serif text-4xl sm:mb-9 sm:text-5xl">Products</h2>
        {products.length
          ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} image={imageByProduct.get(product.id)} />)}</div>
          : <p className="text-sm leading-7 text-[#526056]">No products listed yet.</p>}
      </div>
    </section>

    {gallery.length > 0 && <section id="photos" aria-labelledby="photos-heading" className={`${contentWidth} scroll-mt-6 py-12 sm:py-16`}>
      <h2 id="photos-heading" className="mb-7 font-serif text-4xl sm:mb-9 sm:text-5xl">Photos</h2>
      <div className={`grid gap-4 ${gallery.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
        {gallery.map((image) => <ProfileImage key={image.id} src={image.url} alt={image.alt_text || `${vendor.name} business photo`}
          className={gallery.length === 1 ? "aspect-[4/3] sm:aspect-[2/1]" : "aspect-[4/3]"}
          sizes={gallery.length === 1 ? "(max-width: 1151px) 100vw, 1088px" : "(max-width: 639px) calc(100vw - 48px), (max-width: 1023px) 50vw, 347px"} />)}
      </div>
    </section>}

    <VendorReviews summary={summary} reviews={reviews} slug={vendor.slug} page={reviewPage} sort={sort} />

    <section id="location" aria-labelledby="location-heading" className={`${contentWidth} grid scroll-mt-6 gap-6 py-12 sm:py-16 lg:grid-cols-[1fr_1.4fr] lg:gap-16`}>
      <h2 id="location-heading" className="font-serif text-4xl sm:text-5xl">Location</h2>
      <div>
        <address className="not-italic text-base leading-8">{vendor.address && <p className="mb-2">{vendor.address}</p>}<p>{locality}, Malaysia</p></address>
        {!vendor.address && <p className="mt-3 text-sm leading-6 text-[#526056]">A street address hasn’t been added yet.</p>}
        {vendor.location_notes && <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#526056]">{vendor.location_notes}</p>}
        {mapUrl && <a className="editorial-action mt-5 inline-flex min-h-11 items-center text-sm underline underline-offset-4" href={mapUrl} rel="noopener noreferrer">Open in Google Maps</a>}
      </div>
    </section>
  </>;
}

export default async function VendorPage({ params, searchParams }: Props) {
  const vendor = await getPublicVendor((await params).slug);
  if (!vendor) notFound();
  const query = await searchParams;
  const reviewPage = reviewPageNumber(query.reviews);
  const sort = query.reviewSort === "highest" || query.reviewSort === "lowest" ? query.reviewSort : "newest";
  return <EditorialShell>
    <main id="main" className="font-sans">
      <Suspense fallback={<div role="status" className={`${contentWidth} py-16`}><h1 className="font-serif text-5xl">{vendor.name}</h1><p className="mt-4 text-sm">Loading this local story…</p></div>}>
        <ProfileDetails vendor={vendor} reviewPage={reviewPage} sort={sort} />
      </Suspense>
    </main>
  </EditorialShell>;
}
