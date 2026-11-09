import Link from "next/link";
import { discoveryUrl, type DiscoveryFilters } from "@/lib/vendors/discovery-params";

export function Pagination({ filters, pages }: { filters: DiscoveryFilters; pages: number }) {
  if (pages <= 1) return null;
  return <nav aria-label="Vendor result pages" className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm sm:gap-5">
    {filters.page > 1 ? <Link href={discoveryUrl({ ...filters, page: filters.page - 1 })} className="inline-flex min-h-12 items-center rounded-sm border border-hutan/25 px-4">Previous</Link> : <span aria-disabled="true" className="px-4 text-[#5d665f]">Previous</span>}
    <span aria-current="page">Page {filters.page} of {pages}</span>
    {filters.page < pages ? <Link href={discoveryUrl({ ...filters, page: filters.page + 1 })} className="inline-flex min-h-12 items-center rounded-sm border border-hutan/25 px-4">Next</Link> : <span aria-disabled="true" className="px-4 text-[#5d665f]">Next</span>}
  </nav>;
}
