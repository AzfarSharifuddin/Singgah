import Link from "next/link";
import type { DiscoveryVendor } from "@/lib/vendors/discovery";
import { locationSummary } from "@/lib/vendors/format";
import { RatingStars } from "@/components/vendor/rating-stars";

export function VendorCard({ vendor }: { vendor: DiscoveryVendor }) {
  return <article className="h-full">
    <Link href={`/vendor/${vendor.slug}`} className="group flex h-full flex-col rounded-2xl border border-hutan/15 bg-white p-6 transition-colors hover:border-hutan/60" aria-label={`View ${vendor.name}`}>
      <div className="flex items-start justify-between gap-4"><div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#f0e8da] font-serif text-2xl">{vendor.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</div><span aria-hidden="true" className="text-xl text-[#86513a]">↗</span></div>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86513a]">{vendor.category.name}{vendor.subcategory && ` · ${vendor.subcategory.name}`}</p>
      <h3 className="mt-2 font-serif text-2xl group-hover:underline group-hover:underline-offset-4">{vendor.name}</h3>
      <p className="mt-3 text-sm leading-6 text-[#46534a]">{locationSummary(vendor.area?.name, vendor.city.name)}<span className="block text-xs">{vendor.state.name}, Malaysia</span></p>
      {vendor.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#5d665f]">{vendor.description}</p>}
      <div className="mt-auto pt-5"><div className="flex flex-wrap items-center gap-2 border-t border-hutan/10 pt-4 text-xs text-[#5d665f]">{vendor.rating?.average_rating != null && vendor.rating.review_count > 0 ? <><RatingStars rating={vendor.rating.average_rating} /><span>{vendor.rating.average_rating.toFixed(1)} · {vendor.rating.review_count} {vendor.rating.review_count === 1 ? "review" : "reviews"}</span></> : <span>No reviews yet</span>}</div></div>
    </Link>
  </article>;
}
