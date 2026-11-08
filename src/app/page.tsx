import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import { getLatestVendors, getDiscoveryOptions } from "@/lib/vendors/discovery";
import { discoveryUrl } from "@/lib/vendors/discovery-params";
import { VendorCard } from "@/components/discovery/vendor-card";
import { PublicShell } from "@/components/discovery/public-shell";

const editorialFont = localFont({
  src: "./fonts/eb-garamond-latin-regular.woff2",
  variable: "--font-editorial",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Singgah — Stories Make Places Brighter",
  description: "Discover local vendors and small businesses around Malaysia. Find your next local favourite with Singgah.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: { title: "Singgah — Stories Make Places Brighter", description: "Find the small businesses that make Malaysia special.", type: "website", locale: "en_MY", siteName: "Singgah" },
};

// Editorial photography illustrates categories, not individual listed businesses.
// Labels and destinations still come from Supabase; new categories get a local fallback.
const categoryPhotos: Record<string, string> = {
  "food-beverage": "food",
  "fashion-attire": "fashion",
  "beauty-personal-care": "beauty",
  "crafts-lifestyle": "market-walkway",
  services: "shops-at-night",
  other: "heritage",
};

export default async function Home() {
  const [options, latest] = await Promise.all([getDiscoveryOptions(), getLatestVendors()]);

  return (
    <PublicShell editorial className={editorialFont.variable}>
      <main id="main">
        <section aria-labelledby="home-heading" className="home-opening relative isolate overflow-hidden">
          <Image
            src="/images/home/kampung.webp"
            alt="Traditional houses and coconut palms beside a green field and reflective water."
            fill
            sizes="100vw"
            preload
            className="home-opening-photo -z-20 object-cover"
          />
          <div className="flex min-h-[calc(100svh-4.25rem)] flex-col justify-end gap-7 px-6 py-8 sm:min-h-[calc(100svh-5.25rem)] sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:py-12">
            <h1 id="home-heading" className="home-opening-title font-serif text-[3.25rem] leading-[1] text-white sm:text-7xl lg:text-[6rem]">
              Stories Make<br />Places Brighter.
            </h1>
            <Link href="/discover" className="home-action inline-flex min-h-12 shrink-0 items-center justify-center self-end rounded-sm bg-hutan px-7 text-sm text-white hover:bg-[#28513d]">
              Explore Singgah
            </Link>
          </div>
        </section>

        <section aria-labelledby="story-heading" className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:px-8 sm:py-28 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
          <div className="max-w-sm md:pl-6">
            <h2 id="story-heading" className="font-serif text-4xl leading-[1.05] sm:text-5xl">A little stop.<br />A new story.</h2>
            <p className="mt-6 max-w-xs text-xl leading-relaxed sm:text-2xl">Meet the people and small businesses that make a place its own.</p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image src="/images/home/local-street.webp" alt="A local shop with hanging hats, red lanterns and a trishaw by the pavement." fill sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1151px) 55vw, 600px" className="object-cover" />
          </div>
        </section>

        <section aria-labelledby="category-heading" className="bg-[#f1e7d6] py-20 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <h2 id="category-heading" className="px-6 font-serif text-4xl leading-tight sm:px-8 sm:text-5xl">What brings you here?</h2>
            <ul aria-label="Vendor categories" className="home-categories mt-9 grid auto-cols-[72%] grid-flow-col gap-4 overflow-x-auto px-6 pb-5 sm:mt-12 sm:auto-cols-[38%] sm:px-8 lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-6">
              {options.categories.map((category) => (
                <li key={category.id} className="min-w-0 snap-start">
                  <Link href={discoveryUrl({ category: category.slug })} className="group relative isolate flex aspect-[4/5] items-end overflow-hidden rounded-sm bg-hutan p-5 text-white focus-visible:outline-white focus-visible:outline-offset-[-5px]">
                    <Image src={`/images/home/${categoryPhotos[category.slug] ?? "market-walkway"}.webp`} alt="" fill sizes="(max-width: 639px) 72vw, (max-width: 1023px) 38vw, (max-width: 1279px) 16vw, 190px" className="-z-20 object-cover" />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/15 to-transparent group-hover:from-black/95" />
                    <span className="font-sans text-sm font-semibold leading-5 group-hover:underline group-hover:underline-offset-4">{category.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="latest-heading" className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
          <div className={latest.length === 1 ? "grid items-start gap-10 md:grid-cols-[0.85fr_1.15fr] md:gap-16" : "space-y-10"}>
            <div className="max-w-md">
              <h2 id="latest-heading" className="font-serif text-4xl leading-[1.05] sm:text-5xl">New to the neighbourhood</h2>
              <Link href="/discover?sort=newest" className="home-action mt-5 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Explore all vendors</Link>
            </div>
            {latest.length ? (
              <div className={`grid gap-6 font-sans ${latest.length === 1 ? "mx-auto w-full max-w-md md:mx-0 md:justify-self-end" : latest.length === 2 ? "mx-auto max-w-3xl sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                {latest.map((vendor) => <VendorCard key={vendor.id} vendor={vendor} />)}
              </div>
            ) : (
              <p className="text-xl leading-relaxed">Our local stories are on their way. Check back soon.</p>
            )}
          </div>
        </section>

        <section aria-labelledby="destination-heading" className="bg-[#f5eee3] py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 sm:px-8 md:grid-cols-[1.15fr_0.85fr] md:gap-16">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image src="/images/home/heritage.webp" alt="A row of colourful heritage shophouses under a clear blue sky." fill sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1151px) 55vw, 600px" className="object-cover" />
            </div>
            <div>
              <h2 id="destination-heading" className="font-serif text-4xl leading-[1.05] sm:text-5xl">Somewhere familiar.<br />Somewhere new.</h2>
              <p className="mt-5 text-xl leading-relaxed sm:text-2xl">Find your next local stop.</p>
              <form action="/discover" method="get" aria-label="Explore by destination" className="mt-7">
                <label htmlFor="home-state" className="home-label block text-sm">State / Federal territory</label>
                <select id="home-state" name="state" defaultValue="" className="home-control mt-2 min-h-12 w-full min-w-0 rounded-sm border border-hutan/30 bg-transparent px-3 text-sm">
                  <option value="">Choose a destination</option>
                  {options.states.map((state) => <option key={state.id} value={state.slug}>{state.name}</option>)}
                </select>
                <button type="submit" className="home-action mt-4 inline-flex min-h-12 items-center justify-center rounded-sm bg-hutan px-6 text-sm text-white hover:bg-[#28513d]">Explore vendors</button>
              </form>
            </div>
          </div>
        </section>

        <section aria-labelledby="join-heading" className="bg-hutan py-16 text-rembulan sm:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 sm:px-8 md:grid-cols-[1fr_0.85fr] md:gap-24">
            <div>
              <h2 id="join-heading" className="max-w-sm font-serif text-4xl leading-[1.05] sm:text-5xl">Your business has a story.</h2>
              <p className="mt-5 text-xl leading-relaxed sm:text-2xl">Give it a place on Singgah.</p>
              <Link href="/vendor/register" className="home-action mt-6 inline-flex min-h-12 items-center justify-center rounded-sm bg-rembulan px-6 text-sm text-hutan hover:bg-white">Join Singgah</Link>
            </div>
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image src="/images/home/local-street.webp" alt="Handmade hats displayed outside a neighbourhood shop." fill sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1151px) 42vw, 440px" className="object-cover object-[62%_45%]" />
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
