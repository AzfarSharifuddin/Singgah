import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { discoverVendors, getDiscoveryOptions } from "@/lib/vendors/discovery";
import { DISCOVERY_PAGE_SIZE, discoveryUrl, normalizeDiscovery, needsCanonicalRedirect, type QueryParams } from "@/lib/vendors/discovery-params";
import { EditorialShell } from "@/components/brand/editorial-shell";
import { DiscoveryForm } from "@/components/discovery/discovery-form";
import { VendorCard } from "@/components/discovery/vendor-card";
import { Pagination } from "@/components/discovery/pagination";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Discover local vendors in Malaysia | Singgah",
  description: "Find Malaysian local vendors by name, category and neighbourhood. Explore food, fashion, crafts and more.",
  robots: { index: false, follow: true },
};

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<QueryParams> }) {
  const [raw, options] = await Promise.all([searchParams, getDiscoveryOptions()]);
  const filters = normalizeDiscovery(raw, options);
  if (needsCanonicalRedirect(raw, filters)) redirect(discoveryUrl(filters));
  const result = await discoverVendors(filters, options);
  if (filters.page > result.pages) redirect(discoveryUrl({ ...filters, page: result.pages }));
  const active = [filters.q ? `“${filters.q}”` : "", ...(["category", "subcategory", "state", "city", "area"] as const).map((key) => {
    const collection = { category: options.categories, subcategory: options.subcategories, state: options.states, city: options.cities, area: options.areas }[key];
    return collection.find((option) => option.slug === filters[key])?.name ?? "";
  })].filter(Boolean);
  return <EditorialShell><main id="main">
    <DiscoveryForm key={discoveryUrl(filters)} filters={filters} options={options} image={<Image src="/images/editorial/market.webp" alt="People browsing neighbourhood stalls beneath striped market awnings." fill sizes="100vw" preload className="object-cover object-[50%_55%]" />} intro={<>
      <h1 className="font-serif text-5xl leading-[1.05] sm:text-6xl">Take a little detour.</h1><p className="mt-5 max-w-md text-xl leading-relaxed sm:text-2xl">From familiar neighbourhoods to somewhere new. Find the small businesses that make a place its own.</p>
    </>} />
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-12">
    <section aria-labelledby="results-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="results-heading" className="font-serif text-3xl sm:text-4xl">{result.count} {result.count === 1 ? "local find" : "local finds"}</h2>{result.count > 0 && <p className="editorial-label text-xs text-[#46534a]">Showing {(filters.page - 1) * DISCOVERY_PAGE_SIZE + 1}–{Math.min(filters.page * DISCOVERY_PAGE_SIZE, result.count)} of {result.count}</p>}</div>
      {active.length > 0 && <div className="mt-5 flex flex-wrap items-center gap-2 font-sans" aria-label="Active filters">{active.map((label, index) => <span key={`${label}-${index}`} className="rounded-sm bg-[#eee5d6] px-3 py-2 text-xs">{label}</span>)}<Link href="/discover" className="inline-flex min-h-11 items-center px-2 text-xs underline underline-offset-4">Clear filters</Link></div>}
      {result.vendors.length ? <div className="mt-8 grid gap-6 font-sans sm:grid-cols-2 lg:grid-cols-3" data-testid="vendor-results">{result.vendors.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}</div> : <div className="mt-8 border-y border-hutan/20 bg-[#f5eee3] px-6 py-12 text-center sm:px-12"><h3 className="font-serif text-3xl">No vendors found</h3><p className="mx-auto mt-4 max-w-md font-sans text-sm leading-7 text-[#46534a]">Try a shorter search, another category, or a wider area. There may be something lovely just around the corner.</p><div className="mt-6 flex flex-wrap justify-center gap-4"><Link href="/discover" className="editorial-action inline-flex min-h-12 items-center rounded-sm bg-hutan px-6 text-sm text-white">Browse all vendors</Link>{(filters.area || filters.city || filters.subcategory) && <Link href={discoveryUrl({ ...filters, area: "", city: "", subcategory: "", page: 1 })} className="editorial-action inline-flex min-h-12 items-center text-sm underline underline-offset-4">Broaden these filters</Link>}</div></div>}
      <Pagination filters={filters} pages={result.pages} />
    </section>
    </div>
  </main></EditorialShell>;
}
