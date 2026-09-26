import Link from "next/link";
import { discoveryUrl, type DiscoveryFilters } from "@/lib/vendors/discovery-params";

export function Pagination({ filters, pages }: { filters: DiscoveryFilters; pages: number }) {
  if (pages <= 1) return null;
  return <nav aria-label="Vendor result pages" className="mt-8 flex items-center justify-center gap-5 text-sm">
    {filters.page > 1 ? <Link href={discoveryUrl({ ...filters, page: filters.page - 1 })} className="inline-flex min-h-12 items-center rounded-full border border-hutan/20 px-5">Previous</Link> : <span aria-disabled="true" className="px-5 text-[#5d665f]">Previous</span>}
    <span aria-current="page">Page {filters.page} of {pages}</span>
    {filters.page < pages ? <Link href={discoveryUrl({ ...filters, page: filters.page + 1 })} className="inline-flex min-h-12 items-center rounded-full border border-hutan/20 px-5">Next</Link> : <span aria-disabled="true" className="px-5 text-[#5d665f]">Next</span>}
  </nav>;
}
