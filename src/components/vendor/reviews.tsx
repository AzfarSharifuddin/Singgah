import Link from "next/link";
import type { ProfileContent } from "@/lib/vendors/profile";
import { REVIEWS_PER_PAGE } from "@/lib/vendors/profile";
import { RatingStars } from "./rating-stars";

export function VendorReviews({ summary, reviews, slug, page, sort }: {
  summary: ProfileContent["summary"]; reviews: ProfileContent["reviews"]; slug: string; page: number; sort: "newest" | "highest" | "lowest";
}) {
  const totalPages = Math.max(1, Math.ceil(summary.review_count / REVIEWS_PER_PAGE));
  return <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-8 border-t border-hutan/10 pt-9">
    <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="reviews-heading" className="font-serif text-3xl">From the community</h2><span className="text-sm text-[#5d665f]">{summary.review_count} published {summary.review_count === 1 ? "review" : "reviews"}</span></div>
    <form action={`/vendor/${slug}#reviews`} method="get" className="mt-5 flex flex-wrap items-center gap-3"><label htmlFor="review-sort" className="text-sm font-semibold">Sort reviews</label><select id="review-sort" name="reviewSort" defaultValue={sort} className="min-h-11 rounded-lg border border-hutan/25 bg-white px-3"><option value="newest">Newest</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select><button className="min-h-11 rounded-lg bg-hutan px-4 text-sm text-white" type="submit">Apply</button></form>
    {summary.review_count > 0 ? <>
      <div className="mt-6 grid gap-6 rounded-2xl bg-[#f1ece2] p-6 sm:grid-cols-[130px_1fr]">
        <div><p className="font-serif text-5xl">{summary.average_rating?.toFixed(1)}</p><div className="mt-3"><RatingStars rating={summary.average_rating ?? 0} /></div><p className="mt-2 text-xs text-[#5d665f]">Overall experience</p></div>
        <div className="space-y-2">{([5, 4, 3, 2, 1] as const).map((star) => {
          const count = summary[`stars_${star}`];
          return <div key={star} className="flex items-center gap-3 text-xs"><span className="w-12 shrink-0">{star} {star === 1 ? "star" : "stars"}</span><div role="img" aria-label={`${star} stars: ${count} reviews`} className="h-2 flex-1 overflow-hidden rounded-full bg-hutan/10"><div className="h-full rounded-full bg-hutan" style={{ width: `${count / summary.review_count * 100}%` }} /></div><span aria-hidden="true" className="w-6 text-right tabular-nums">{count}</span></div>;
        })}</div>
      </div>
      <div className="divide-y divide-hutan/10">{reviews.map((review) => <article key={review.id} className="py-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{review.reviewer_name?.trim() || "Anonymous"}</h3><time dateTime={review.created_at} className="text-xs text-[#5d665f]">{new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(review.created_at))}</time></div>
        <div className="mt-3"><RatingStars rating={review.rating} /></div>
        {review.review_text?.trim() && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#46534a]">{review.review_text}</p>}
      </article>)}</div>
      {!reviews.length && <p className="py-6 text-sm text-[#5d665f]">No reviews on this page.</p>}
      {(totalPages > 1 || page > 1) && <nav aria-label="Review pages" className="flex flex-wrap items-center gap-4 text-sm">
        {page > 1 && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`/vendor/${slug}?reviewSort=${sort}&reviews=${Math.min(page - 1, totalPages)}#reviews`}>Previous reviews</Link>}
        {page <= totalPages && <span>Page {page} of {totalPages}</span>}
        {page < totalPages && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`/vendor/${slug}?reviewSort=${sort}&reviews=${page + 1}#reviews`}>Next reviews</Link>}
      </nav>}
    </> : <p className="mt-6 rounded-2xl border border-dashed border-hutan/20 p-6 text-sm leading-6 text-[#5d665f]">No reviews yet. Every local story starts somewhere.</p>}
  </section>;
}
