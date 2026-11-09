import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { EditorialShell } from "@/components/brand/editorial-shell";
export const metadata: Metadata = { title: "Frequently asked questions | Singgah", description: "A quick guide to finding local vendors and sharing your experience on Singgah." };
const questions = [
  ["What is Singgah?", "Singgah helps you discover local Malaysian vendors, from food stalls and home businesses to independent makers. Each vendor has a public page with business information, products and community reviews."],
  ["Do I need an account to browse?", "No. You can explore vendors and read public profiles without signing up. Search by vendor name or description, and narrow your results by category and location."],
  ["How do I leave a review?", "Open a vendor profile and choose Leave a Review. Enter your name using letters and spaces only, then give an overall rating from 1 to 5 stars. Written feedback and individual product ratings are optional. Agree to the terms before submitting."],
  ["Why can I only review a vendor once?", "Singgah allows one review per customer identity for each vendor. A private browser session identifies you without requiring an email signup. Keep that session to retain your identity; clearing browser storage may lose it. Please do not create new identities to repeat reviews."],
  ["Is my review anonymous?", "No. Your name, rating, optional text and submission date are public. Singgah also keeps an internal account identifier to enforce review limits."],
  ["Are product ratings required?", "No. You can rate just the vendor. Product ratings are optional, use 1–5 stars and do not have separate written comments."],
  ["Can I edit my review?", "Review editing and deletion controls are not available yet. Please check your rating and text before submitting. Reviews may be withheld or removed if they break the community rules."],
  ["Does a review prove someone visited?", "No. The name and security checks help protect submissions, but they do not verify a purchase or physical visit."],
  ["Can I buy products through Singgah?", "Singgah is a directory, not an online checkout. Contact the vendor directly about prices, availability, opening times and purchases. Listings can change, particularly for pop-up vendors."],
  ["How do vendors join?", "Vendors can register with an email and password, confirm their email, and create their business profile. New profiles await approval before becoming public. Vendor accounts manage business information, products and photos."],
  ["Why is my neighbourhood missing?", "Location choices cover all Malaysian states and federal territories and the DOSM district reporting list. Neighbourhood coverage is still growing. Vendors can choose their city or district, leave the optional locality blank, and include the neighbourhood in their readable address."],
];
export default function FAQPage() {
  return <EditorialShell><main id="main">
    <section aria-labelledby="faq-heading" className="relative isolate overflow-hidden bg-hutan text-white">
      <Image src="/images/editorial/heritage-street.webp" alt="Local shops and a cafe along a heritage street." fill sizes="100vw" preload className="-z-20 object-cover object-[50%_55%]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-black/55 lg:bg-transparent lg:bg-linear-to-r lg:from-black/65 lg:via-black/55 lg:to-black/25" />
      <div className="mx-auto flex min-h-[25rem] max-w-6xl items-end px-6 py-12 sm:min-h-[28rem] sm:px-8 sm:py-16">
        <div className="max-w-xl">
          <p className="editorial-label text-xs">A little help along the way</p>
          <h1 id="faq-heading" className="mt-4 max-w-xl font-serif text-5xl leading-[1.05] sm:text-6xl">Frequently asked questions</h1>
          <p className="mt-5 max-w-md text-xl leading-relaxed sm:text-2xl">Finding local places and sharing honest stories, made simple.</p>
        </div>
      </div>
    </section>
    <div className="mx-auto max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
      <div className="editorial-faq divide-y divide-hutan/20 border-y border-hutan/20">
        {questions.map(([question, answer], index) => <details key={question} open={index === 0} className="group py-4 sm:py-5">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6">
            <h2 className="font-serif text-2xl leading-snug sm:text-3xl">{question}</h2>
            <span aria-hidden="true" className="shrink-0 font-sans text-xl"><span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></span>
          </summary>
          <p className="mt-4 max-w-prose pr-6 font-sans text-[15px] leading-8 text-[#46534a]">{answer}</p>
        </details>)}
      </div>
      <Link href="/discover" className="editorial-action mt-10 inline-flex min-h-12 items-center rounded-sm bg-hutan px-6 text-sm text-white hover:bg-[#28513d]">Explore vendors</Link>
    </div>
  </main></EditorialShell>;
}
