import type { ProfileContent } from "@/lib/vendors/profile";
import { formatPrice } from "@/lib/vendors/format";
import { ProfileImage } from "./profile-image";
import { RatingStars } from "./rating-stars";

export function ProductCard({ product, image }: {
  product: ProfileContent["products"][number]; image?: ProfileContent["images"][number];
}) {
  const price = formatPrice(product.price);
  const summary = product.summary;
  return <article className="overflow-hidden rounded-2xl border border-hutan/10 bg-white">
    <ProfileImage src={image?.url ?? null} alt={image?.alt_text || product.name} className="aspect-[4/3]" sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 240px" />
    <div className="p-5">
      <h3 className="text-lg font-semibold leading-snug">{product.name}</h3>
      {product.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#5d665f]">{product.description}</p>}
      <p className="mt-3 text-sm font-semibold">{price ?? <span className="font-normal text-[#5d665f]">Price not listed</span>}</p>
      <div className="mt-4 border-t border-hutan/10 pt-4 text-xs text-[#5d665f]">
        {summary?.average_rating != null && summary.rating_count > 0 ? <div className="flex flex-wrap items-center gap-2">
          <RatingStars rating={summary.average_rating} /><span>{summary.average_rating.toFixed(1)} · {summary.rating_count} {summary.rating_count === 1 ? "rating" : "ratings"}</span>
        </div> : "No ratings yet"}
      </div>
    </div>
  </article>;
}
