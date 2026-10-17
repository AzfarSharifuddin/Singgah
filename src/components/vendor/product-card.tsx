import type { ProfileContent } from "@/lib/vendors/profile";
import { formatPrice } from "@/lib/vendors/format";
import { ProfileImage } from "./profile-image";
import { RatingStars } from "./rating-stars";
import { ProductDescription } from "./product-description";

export function ProductCard({ product, image }: {
  product: ProfileContent["products"][number]; image?: ProfileContent["images"][number];
}) {
  const price = formatPrice(product.price);
  const summary = product.summary;
  return <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-hutan/10 bg-white">
    <ProfileImage src={image?.url ?? null} alt={image?.alt_text || product.name} className="aspect-[4/3] shrink-0" sizes="(max-width: 639px) calc(100vw - 40px), (max-width: 1023px) calc((100vw - 80px) / 2), (max-width: 1151px) calc((100vw - 428px) / 2), 362px" />
    <div className="flex flex-1 flex-col p-5">
      <h3 className="min-h-[3.125rem] text-lg font-semibold leading-snug">{product.name}</h3>
      {product.description && <ProductDescription description={product.description} name={product.name} />}
      <footer className="mt-auto pt-5">
        <p className="text-lg font-semibold tracking-tight tabular-nums">{price ?? <span className="text-sm font-normal tracking-normal text-[#5d665f]">Price not listed</span>}</p>
        <div className="mt-3 flex min-h-9 items-end border-t border-hutan/10 pt-3 text-xs text-[#5d665f]">
          {summary?.average_rating != null && summary.rating_count > 0 ? <div className="flex flex-wrap items-center gap-2">
            <RatingStars rating={summary.average_rating} /><span>{summary.average_rating.toFixed(1)} · {summary.rating_count} {summary.rating_count === 1 ? "rating" : "ratings"}</span>
          </div> : "No ratings yet"}
        </div>
      </footer>
    </div>
  </article>;
}
