import Link from "next/link";
import { BrandDivider } from "@/components/brand/brand-accents";

export function PublicFooter() {
  return <footer className="mt-12 px-5 pb-8 pt-3 text-center text-xs text-[#5d665f]">
    <BrandDivider className="mb-7" />
    <p>Singgah · Stories Make Places Brighter</p>
    <nav aria-label="Footer" className="mt-2 flex flex-wrap justify-center gap-x-6"><Link href="/faq" className="inline-flex min-h-11 items-center underline underline-offset-4">FAQ</Link><Link href="/terms" className="inline-flex min-h-11 items-center underline underline-offset-4">Terms and conditions</Link></nav>
  </footer>;
}
