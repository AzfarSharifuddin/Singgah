import Link from "next/link";
import type { DiscoveryVendor } from "@/lib/vendors/discovery";
import { locationSummary } from "@/lib/vendors/format";
import { RatingStars } from "@/components/vendor/rating-stars";
import { ProfileImage } from "@/components/vendor/profile-image";

export function VendorCard({ vendor, priority = false }: { vendor: DiscoveryVendor; priority?: boolean }) {
  return <article className="h-full">
    <Link href={`/vendor/${vendor.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hutan/10 bg-white transition-colors hover:border-hutan/50" aria-label={`View ${vendor.name}`}>
      <ProfileImage src={vendor.cover?.url ?? null} alt={vendor.cover?.alt || `${vendor.name} cover photo`} className="aspect-[12/5] w-full shrink-0" sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 84px) / 2), (max-width: 1151px) calc((100vw - 104px) / 3), 350px" priority={priority} />
      <div className="flex flex-1 items-start gap-4 p-4 sm:p-5">
        <ProfileImage src={vendor.logo?.url ?? null} alt={vendor.logo?.alt || `${vendor.name} logo`} initials={vendor.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")} className="size-14 shrink-0 rounded-full" sizes="56px" fit="contain" />
        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86513a]">{vendor.category.name}{vendor.subcategory && ` · ${vendor.subcategory.name}`}</p>
          <h3 className="mt-1 font-serif text-xl leading-snug group-hover:underline group-hover:underline-offset-4">{vendor.name}</h3>
          <p className="mt-2 text-xs leading-5 text-[#46534a]">{locationSummary(vendor.area?.name, vendor.city.name)}<span className="block text-[#5d665f]">{vendor.state.name}, Malaysia</span></p>
          <div className="mt-auto pt-3"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#5d665f]">{vendor.rating?.average_rating != null && vendor.rating.review_count > 0 ? <><RatingStars rating={vendor.rating.average_rating} /><span>{vendor.rating.average_rating.toFixed(1)} · {vendor.rating.review_count} {vendor.rating.review_count === 1 ? "review" : "reviews"}</span></> : <span>No reviews yet</span>}</div></div>
        </div>
      </div>
    </Link>
  </article>;
}
