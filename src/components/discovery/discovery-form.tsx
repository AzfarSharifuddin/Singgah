"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { discoveryUrl, normalizeDiscovery, type DiscoveryFilters, type DiscoveryOptions } from "@/lib/vendors/discovery-params";

export function DiscoveryForm({ filters, options }: { filters: DiscoveryFilters; options: DiscoveryOptions }) {
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
  const selectClass = "mt-2 min-h-12 w-full min-w-0 rounded-lg border border-hutan/20 bg-white px-3 text-sm disabled:bg-[#f1eee7] disabled:text-[#657167]";
  return <form action="/discover" method="get" onSubmit={(event) => {
    event.preventDefault();
    const values = Object.fromEntries([...new FormData(event.currentTarget)].map(([key, val]) => [key, String(val)]));
    startTransition(() => router.push(discoveryUrl(normalizeDiscovery(values, options)), { scroll: false }));
  }} className="rounded-2xl border border-hutan/15 bg-white p-4 sm:p-6" aria-label="Vendor search and filters" aria-busy={pending}>
    {pending && <p role="status" className="mb-3 text-sm">Updating vendors…</p>}
    <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm font-semibold" htmlFor="vendor-search">Search vendors<input id="vendor-search" name="q" type="search" defaultValue={filters.q} maxLength={100} placeholder="Try a vendor name or description" className="mt-2 min-h-12 w-full min-w-0 rounded-lg border border-hutan/25 px-3 text-sm font-normal" /></label><button className="min-h-12 rounded-lg bg-hutan px-5 text-sm font-semibold text-white hover:bg-[#28523e]" type="submit">Search</button></div>
    <button type="button" aria-controls="discovery-filters" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="mt-4 min-h-11 w-full rounded-lg border border-hutan/20 px-4 text-left text-sm lg:hidden">{expanded ? "Hide filters −" : "Filters & sorting +"}</button>
    <div id="discovery-filters" className={`${expanded ? "grid" : "hidden"} mt-5 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-3`}>
      <label className="min-w-0 text-xs font-semibold">Category<select aria-label="Category" name="category" value={category} onChange={(event) => { setCategory(event.target.value); setSubcategory(""); }} className={selectClass}><option value="">All categories</option>{options.categories.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="min-w-0 text-xs font-semibold">Subcategory<select aria-label="Subcategory" name="subcategory" value={subcategory} disabled={!category} onChange={(event) => setSubcategory(event.target.value)} className={selectClass}><option value="">{category ? "All subcategories" : "Choose a category first"}</option>{options.subcategories.filter((option) => option.category_id === categoryId).map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="min-w-0 text-xs font-semibold">State<select aria-label="State" name="state" value={state} onChange={(event) => { setState(event.target.value); setCity(""); setArea(""); }} className={selectClass}><option value="">All states</option>{options.states.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="min-w-0 text-xs font-semibold">City / District<select aria-label="City / District" name="city" value={city} disabled={!state} onChange={(event) => { setCity(event.target.value); setArea(""); }} className={selectClass}><option value="">{state ? "All cities / districts" : "Choose a state first"}</option>{options.cities.filter((option) => option.state_id === stateId).map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="min-w-0 text-xs font-semibold">Area / Locality<select aria-label="Area / Locality" name="area" value={area} disabled={!city} onChange={(event) => setArea(event.target.value)} className={selectClass}><option value="">{city ? "All areas / localities" : "Choose a city first"}</option>{options.areas.filter((option) => option.city_id === cityId).map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}</select></label>
      <label className="min-w-0 text-xs font-semibold">Sort by<select aria-label="Sort by" name="sort" defaultValue={filters.sort} className={selectClass}><option value="name">Name: A–Z</option><option value="newest">Newest first</option></select></label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3"><button type="submit" className="min-h-11 rounded-lg bg-hutan px-5 text-sm font-semibold text-white">Apply filters</button><Link href="/discover" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Clear filters</Link></div>
    </div>
  </form>;
}
