"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { discoveryUrl, normalizeDiscovery, type DiscoveryFilters, type DiscoveryOptions } from "@/lib/vendors/discovery-params";

export function DiscoveryForm({ filters, options, intro, image }: { filters: DiscoveryFilters; options: DiscoveryOptions; intro: ReactNode; image: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState(filters.category);
  const [subcategory, setSubcategory] = useState(filters.subcategory);
  const [state, setState] = useState(filters.state);
  const [city, setCity] = useState(filters.city);
  const [area, setArea] = useState(filters.area);
  const categoryId = options.categories.find((option) => option.slug === category)?.id;
  const stateId = options.states.find((option) => option.slug === state)?.id;
  const cityId = options.cities.find((option) => option.slug === city && option.state_id === stateId)?.id;
  const selectClass = "mt-2 min-h-12 w-full min-w-0 rounded-sm border border-hutan/25 bg-[#fffdf9] px-3 font-sans text-sm disabled:bg-[#eee8dd] disabled:text-[#657167]";
  return <form action="/discover" method="get" onSubmit={(event) => {
    event.preventDefault();
    const values = Object.fromEntries([...new FormData(event.currentTarget)].map(([key, val]) => [key, String(val)]));
    startTransition(() => router.push(discoveryUrl(normalizeDiscovery(values, options)), { scroll: false }));
  }} aria-label="Vendor search and filters" aria-busy={pending}>
    <section aria-label="Find local vendors" className="relative isolate overflow-hidden bg-hutan text-white">
      <div className="absolute inset-0 -z-20">{image}</div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-black/55 lg:bg-transparent lg:bg-linear-to-r lg:from-black/65 lg:via-black/55 lg:to-black/25" />
      <div className="mx-auto flex min-h-[25rem] max-w-6xl items-end px-6 py-12 sm:min-h-[28rem] sm:px-8 sm:py-16">
      <div className="w-full max-w-xl">
      {intro}
      {pending && <p role="status" className="mt-4 font-sans text-sm">Updating vendors…</p>}
      <div className="mt-7 flex max-w-3xl flex-wrap items-end gap-3"><label className="min-w-0 flex-1" htmlFor="vendor-search"><span className="sr-only">Search vendors</span><input id="vendor-search" name="q" type="search" defaultValue={filters.q} maxLength={100} placeholder="Search vendors…" className="min-h-12 w-full min-w-0 rounded-sm border border-hutan/25 bg-[#fffdf9] px-4 font-sans text-base text-hutan" /></label><button className="editorial-action min-h-12 rounded-sm bg-rembulan px-5 text-sm text-hutan hover:bg-white" type="submit">Search</button></div>
      </div>
      </div>
    </section>
    <div className="bg-[#f5eee3]">
    <div className="mx-auto max-w-6xl px-6 py-6 sm:px-8">
    <button type="button" aria-controls="discovery-filters" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="editorial-action min-h-12 w-full rounded-sm border border-hutan/25 px-4 text-left text-sm lg:hidden">{expanded ? "Hide filters −" : "Filters & sorting +"}</button>
    <div id="discovery-filters" className={`${expanded ? "grid mt-5 lg:mt-0" : "hidden"} gap-5 border-t border-hutan/20 pt-6 sm:grid-cols-2 lg:grid lg:grid-cols-3 lg:border-0 lg:pt-0`}>
      <label className="editorial-label min-w-0 text-sm">Category<select aria-label="Category" name="category" value={category} onChange={(event) => { setCategory(event.target.value); setSubcategory(""); }} className={selectClass}><option value="">All categories</option>{options.categories.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="editorial-label min-w-0 text-sm">Subcategory<select aria-label="Subcategory" name="subcategory" value={subcategory} disabled={!category} onChange={(event) => setSubcategory(event.target.value)} className={selectClass}><option value="">{category ? "All subcategories" : "Choose a category first"}</option>{options.subcategories.filter((option) => option.category_id === categoryId).map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="editorial-label min-w-0 text-sm">State / Federal territory<select aria-label="State / Federal territory" name="state" value={state} onChange={(event) => { setState(event.target.value); setCity(""); setArea(""); }} className={selectClass}><option value="">All states / territories</option>{options.states.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="editorial-label min-w-0 text-sm">City / District<select aria-label="City / District" name="city" value={city} disabled={!state} onChange={(event) => { setCity(event.target.value); setArea(""); }} className={selectClass}><option value="">{state ? "All cities / districts" : "Choose a state / territory first"}</option>{options.cities.filter((option) => option.state_id === stateId).map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="editorial-label min-w-0 text-sm">Area / Locality<select aria-label="Area / Locality" name="area" value={area} disabled={!city} onChange={(event) => setArea(event.target.value)} className={selectClass}><option value="">{city ? "All areas / localities" : "Choose a city first"}</option>{options.areas.filter((option) => option.city_id === cityId).map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="editorial-label min-w-0 text-sm">Sort by<select aria-label="Sort by" name="sort" defaultValue={filters.sort} className={selectClass}><option value="name">Name: A–Z</option><option value="newest">Newest first</option></select></label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3"><button type="submit" className="editorial-action min-h-12 rounded-sm bg-hutan px-5 text-sm text-white hover:bg-[#28513d]">Apply filters</button><Link href="/discover" className="editorial-action inline-flex min-h-11 items-center text-sm underline underline-offset-4">Clear filters</Link></div>
    </div>
    </div>
    </div>
  </form>;
}
