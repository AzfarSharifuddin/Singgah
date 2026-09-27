import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/discovery/public-shell";
export const metadata: Metadata = { title: "Frequently asked questions | Singgah", description: "A quick guide to finding local vendors and sharing your experience on Singgah." };
const questions = [
  ["What is Singgah?", "Singgah helps you discover local Malaysian vendors, from food stalls and home businesses to independent makers. Each vendor has a public page with business information, products and community reviews."],
  ["Do I need an account to browse?", "No. You can explore vendors and read public profiles without signing up. Search by vendor name or description, and narrow your results by category and location."],
  ["How do I leave a review?", "Open a vendor profile and choose Leave a Review. Give an overall rating from 1 to 5 stars. Written feedback and individual product ratings are optional. Agree to the terms before submitting."],
  ["Why can I only review a vendor once?", "Singgah allows one review per customer identity for each vendor. A private browser session identifies you without requiring an email signup. Keep that session to retain your identity; clearing browser storage may lose it. Please do not create new identities to repeat reviews."],
  ["Is my review anonymous?", "Customer reviews are displayed as Anonymous. Your rating, optional text and submission date are public. Singgah keeps an internal account identifier to enforce review limits. Anonymous display does not mean no data is stored."],
  ["Are product ratings required?", "No. You can rate just the vendor. Product ratings are optional, use 1–5 stars and do not have separate written comments."],
  ["Can I edit my review?", "Review editing and deletion controls are not available yet. Please check your rating and text before submitting. Reviews may be withheld or removed if they break the community rules."],
  ["Does a review prove someone visited?", "No. Anonymous authentication and security checks help protect submissions, but they do not verify a purchase or physical visit."],
  ["Can I buy products through Singgah?", "Singgah is a directory, not an online checkout. Contact the vendor directly about prices, availability, opening times and purchases. Listings can change, particularly for pop-up vendors."],
  ["How do vendors join?", "Vendors can register with an email and password, confirm their email, and create their business profile. New profiles await approval before becoming public. Vendor accounts manage business information, products and photos."],
  ["Why is my neighbourhood missing?", "Location choices cover all Malaysian states and federal territories and the DOSM district reporting list. Neighbourhood coverage is still growing. Vendors can choose their city or district, leave the optional locality blank, and include the neighbourhood in their readable address."],
];
export default function FAQPage() {
  return <PublicShell><main id="main" className="mx-auto max-w-3xl px-5 py-12 sm:px-8"><p className="text-sm font-semibold text-[#86513a]">A little help along the way</p><h1 className="mt-3 font-serif text-4xl">Frequently asked questions</h1><p className="mt-4 leading-7 text-[#46534a]">Finding local places and sharing honest stories, made simple.</p><div className="mt-8 divide-y divide-hutan/15">{questions.map(([question, answer]) => <section key={question} className="py-6"><h2 className="text-lg font-semibold">{question}</h2><p className="mt-3 leading-7 text-[#46534a]">{answer}</p></section>)}</div><Link href="/discover" className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-hutan px-5 text-white">Explore vendors</Link></main></PublicShell>;
}
