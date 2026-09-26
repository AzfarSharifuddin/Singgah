import type { PublicVendor } from "@/lib/vendors/profile";
import { phoneNumber, safeWebsite } from "@/lib/vendors/format";

export function ContactActions({ vendor }: { vendor: PublicVendor }) {
  const phone = phoneNumber(vendor.phone);
  const whatsapp = phoneNumber(vendor.whatsapp);
  const links = [
    { label: "Call vendor", href: phone ? `tel:${phone}` : null },
    { label: "WhatsApp", href: whatsapp ? `https://wa.me/${whatsapp.slice(1)}` : null },
    { label: "Instagram", href: safeWebsite(vendor.instagram_url) },
    { label: "TikTok", href: safeWebsite(vendor.tiktok_url) },
    { label: "Facebook", href: safeWebsite(vendor.facebook_url) },
    { label: "Website", href: safeWebsite(vendor.website_url) },
  ].filter((link): link is { label: string; href: string } => Boolean(link.href));
  if (!links.length) return null;
  return <section aria-label="Contact vendor" className="flex flex-wrap gap-2">
    {links.map(({ label, href }) => <a key={label} href={href} rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-hutan/20 px-5 text-sm font-medium transition-colors hover:bg-hutan hover:text-white">{label}<span aria-hidden="true" className="ml-3">↗</span></a>)}
  </section>;
}
