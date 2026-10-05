import type { Metadata } from "next";
import Link from "next/link";
import { discoverVendors, getDiscoveryOptions } from "@/lib/vendors/discovery";
import { discoveryUrl, normalizeDiscovery } from "@/lib/vendors/discovery-params";
import { VendorCard } from "@/components/discovery/vendor-card";
import { PublicShell } from "@/components/discovery/public-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Singgah — Stories Make Places Brighter",
  description: "Discover local vendors and small businesses around Malaysia. Find your next local favourite with Singgah.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: { title: "Singgah — Stories Make Places Brighter", description: "Find the small businesses that make Malaysia special.", type: "website", locale: "en_MY", siteName: "Singgah" },
};

export default async function Home() {
  const options = await getDiscoveryOptions();
  const latest = await discoverVendors(normalizeDiscovery({ sort: "newest" }, options), options);
  return <PublicShell><main id="main">
    <section className="relative overflow-hidden border-b border-hutan/10 bg-rembulan px-5 py-14 sm:px-8 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-12 size-[500px] rounded-full border border-hutan/10" /><div aria-hidden="true" className="pointer-events-none absolute -right-32 top-24 size-96 rounded-full border border-hutan/10" />
      <div className="relative mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#86513a]">Made of Malaysian stories</p><h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.12] sm:text-7xl">Stories Make<br />Places Brighter<span className="text-[#86513a]">.</span></h1><p className="mt-6 max-w-lg text-base leading-8 text-[#46534a]">Discover local vendors, hidden favourites, and small businesses around Malaysia. A little stop. A new story.</p>
        <form action="/discover" method="get" className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"><label htmlFor="home-search" className="sr-only">Search vendors</label><input id="home-search" name="q" type="search" maxLength={100} placeholder="Search vendor names and descriptions" className="min-h-14 min-w-0 flex-1 rounded-xl border border-hutan/20 bg-white px-4 text-sm" /><button className="min-h-14 rounded-xl bg-hutan px-6 text-sm font-semibold text-white hover:bg-[#28523e]">Explore Singgah <span aria-hidden="true">↗</span></button></form>
        <Link href="/discover" className="mt-3 inline-flex min-h-11 items-center text-xs underline underline-offset-4">Just looking? Browse all vendors</Link>
      </div>
    </section>
    <div className="mx-auto max-w-6xl space-y-14 px-5 py-12 sm:px-8 sm:py-16">
      <section aria-labelledby="category-heading"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#86513a]">Follow your curiosity</p><h2 id="category-heading" className="mt-3 font-serif text-3xl">What brings you here?</h2><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{options.categories.map((category) => <Link key={category.id} href={discoveryUrl({ category: category.slug })} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-hutan/15 bg-white px-5 text-sm hover:border-hutan/60">{category.name}<span aria-hidden="true" className="text-[#86513a]">↗</span></Link>)}</div></section>
      <section aria-labelledby="state-heading" className="rounded-2xl bg-hutan p-6 text-white sm:p-9"><div className="sm:flex sm:items-end sm:justify-between sm:gap-8"><div><p className="text-[10px] uppercase tracking-[0.2em] text-rembulan">Somewhere familiar. Somewhere new.</p><h2 id="state-heading" className="mt-3 font-serif text-3xl">Where shall we singgah?</h2></div><p className="mt-4 max-w-xs text-sm leading-6 text-rembulan">Start with a state. Find the neighbourhood stories within.</p></div><div className="mt-7 flex flex-wrap gap-3">{options.states.map((state) => <Link key={state.id} href={discoveryUrl({ state: state.slug })} className="inline-flex min-h-12 items-center rounded-full border border-rembulan/50 px-5 text-sm hover:bg-rembulan hover:text-hutan">{state.name}</Link>)}</div></section>
      <section aria-labelledby="latest-heading"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="latest-heading" className="font-serif text-3xl">New to the neighbourhood</h2><Link href="/discover?sort=newest" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Explore all vendors ↗</Link></div><p className="mt-2 text-sm text-[#5d665f]">Recently added to Singgah.</p>{latest.vendors.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{latest.vendors.slice(0, 3).map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}</div> : <p className="mt-6 text-sm">Our local stories are on their way. Check back soon.</p>}</section>
    </div>
  </main></PublicShell>;
}
