export function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="relative inline-block whitespace-nowrap text-lg leading-none tracking-[0.12em]" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      <span aria-hidden="true" className="text-hutan/15">★★★★★</span>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 overflow-hidden text-[#94632b]" style={{ width: `${Math.max(0, Math.min(5, rating)) * 20}%` }}>★★★★★</span>
    </span>
  );
}
