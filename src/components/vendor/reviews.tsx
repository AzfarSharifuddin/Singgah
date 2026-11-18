import Link from "next/link";
import type { ProfileContent } from "@/lib/vendors/profile";
import { REVIEWS_PER_PAGE } from "@/lib/vendors/profile";
import { RatingStars } from "./rating-stars";

export function VendorReviews({ summary, reviews, slug, page, sort }: {
  summary: ProfileContent["summary"]; reviews: ProfileContent["reviews"]; slug: string; page: number; sort: "newest" | "highest" | "lowest";
}) {
  const totalPages = Math.max(1, Math.ceil(summary.review_count / REVIEWS_PER_PAGE));
  return <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-6 bg-[#f5eee3] py-12 sm:py-16">
    <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2 id="reviews-heading" className="font-serif text-4xl sm:text-5xl">From the community</h2>
        <Link href={`/vendor/${slug}/review`} className="editorial-action inline-flex min-h-11 items-center text-sm underline underline-offset-4">Leave a Review</Link>
      </div>
      <div className={`grid gap-8 ${summary.review_count > 0 ? "lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14" : ""}`}>
      {summary.review_count > 0 && <div aria-label="Rating summary" className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-5 sm:grid-cols-[140px_minmax(0,1fr)] lg:block">
        <div><p className="font-serif text-6xl sm:text-7xl">{summary.average_rating?.toFixed(1)}<span className="ml-2 font-sans text-sm text-[#526056]">/ 5</span></p><div className="mt-3"><RatingStars rating={summary.average_rating ?? 0} /></div><p className="mt-3 text-sm text-[#526056]">{summary.review_count} {summary.review_count === 1 ? "review" : "reviews"}</p></div>
        <div className="space-y-3 lg:mt-7">{([5, 4, 3, 2, 1] as const).map((star) => {
          const count = summary[`stars_${star}`];
          return <div key={star} className="flex items-center gap-3 text-xs"><span className="w-3 shrink-0" aria-label={`${star} ${star === 1 ? "star" : "stars"}`}>{star}</span><div role="img" aria-label={`${star} stars: ${count} reviews`} className="h-1 flex-1 overflow-hidden bg-hutan/10"><div className="h-full bg-hutan" style={{ width: `${count / summary.review_count * 100}%` }} /></div><span aria-hidden="true" className="w-6 text-right tabular-nums">{count}</span></div>;
        })}</div>
      </div>}
      <div className="min-w-0">
        <form action={`/vendor/${slug}#reviews`} method="get" className="flex flex-wrap items-center gap-3 border-b border-hutan/15 pb-5"><label htmlFor="review-sort" className="editorial-label mr-auto text-sm">Sort reviews</label><select id="review-sort" name="reviewSort" defaultValue={sort} className="min-h-11 max-w-full rounded-sm border border-hutan/25 bg-[#fffdf8] px-3 text-sm"><option value="newest">Newest</option><option value="highest">Highest rated</option><option value="lowest">Lowest rated</option></select><button className="editorial-action min-h-11 rounded-sm bg-hutan px-4 text-sm text-white" type="submit">Apply</button></form>
      <div className="divide-y divide-hutan/15">{reviews.map((review) => <article key={review.id} className="py-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium">{review.reviewer_name?.trim() || "Name not recorded"}</h3><time dateTime={review.created_at} className="text-xs text-[#526056]">{new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(review.created_at))}</time></div>
        <div className="mt-3"><RatingStars rating={review.rating} /></div>
        {review.review_text?.trim() && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#46534a]">{review.review_text}</p>}
      </article>)}</div>
      {!reviews.length && <p className="py-6 text-sm leading-7 text-[#526056]">{summary.review_count > 0 ? "No reviews on this page." : "No reviews yet. Every local story starts somewhere."}</p>}
      {(totalPages > 1 || page > 1) && <nav aria-label="Review pages" className="flex flex-wrap items-center gap-4 text-sm">
        {page > 1 && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`/vendor/${slug}?reviewSort=${sort}&reviews=${Math.min(page - 1, totalPages)}#reviews`}>Previous reviews</Link>}
        {page <= totalPages && <span>Page {page} of {totalPages}</span>}
        {page < totalPages && <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`/vendor/${slug}?reviewSort=${sort}&reviews=${page + 1}#reviews`}>Next reviews</Link>}
      </nav>}
      </div>
      </div>
    </div>
  </section>;
}
