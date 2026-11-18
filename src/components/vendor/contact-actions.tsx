import Image from "next/image";
import type { PublicVendor } from "@/lib/vendors/profile";
import { phoneNumber, safeWebsite } from "@/lib/vendors/format";

export function ContactActions({ vendor }: { vendor: PublicVendor }) {
  const phone = phoneNumber(vendor.phone);
  const whatsapp = phoneNumber(vendor.whatsapp);
  const links = [
    { label: "Call vendor", href: phone ? `tel:${phone}` : null, icon: "phone" },
    { label: "WhatsApp", href: whatsapp ? `https://wa.me/${whatsapp.slice(1)}` : null, icon: "whatsapp" },
    { label: "Instagram", href: safeWebsite(vendor.instagram_url), icon: "instagram" },
    { label: "TikTok", href: safeWebsite(vendor.tiktok_url), icon: "tiktok" },
    { label: "Facebook", href: safeWebsite(vendor.facebook_url), icon: "facebook" },
    { label: "Website", href: safeWebsite(vendor.website_url), icon: null },
  ].filter((link): link is { label: string; href: string; icon: string | null } => Boolean(link.href));
  if (!links.length) return null;
  return <section aria-label="Contact vendor" className="flex flex-wrap items-center gap-2">
    {links.map(({ label, href, icon }) => <a key={label} href={href} rel="noopener noreferrer" aria-label={label}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-3 text-sm underline-offset-4 hover:bg-hutan/5 hover:underline">
      {icon === "phone"
        ? <svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C9.6 21 3 14.4 3 6a3 3 0 0 1 2-3Z" /></svg>
        : icon ? <Image src={`/icons/social/${icon}.svg`} alt="" aria-hidden="true" width={21} height={21} /> : label}
    </a>)}
  </section>;
}
