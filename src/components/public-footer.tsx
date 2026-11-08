import Link from "next/link";
import { BrandDivider } from "@/components/brand/brand-accents";

export function PublicFooter({ quiet = false }: { quiet?: boolean }) {
  if (quiet) return <footer className="mx-6 border-t border-hutan/20 py-8 text-hutan sm:mx-8">
    <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/" aria-label="Singgah home" className="inline-flex min-h-11 items-center self-start font-sans text-sm font-bold tracking-[0.16em]">SINGGAH<span aria-hidden="true" className="text-terracotta">.</span></Link>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-6 text-xs"><Link href="/faq" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">FAQ</Link><Link href="/terms" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Terms and conditions</Link></nav>
    </div>
  </footer>;
  return <footer className="mt-12 px-5 pb-8 pt-3 text-center text-xs text-[#5d665f]">
    <BrandDivider className="mb-7" />
    <p>Singgah · Stories Make Places Brighter</p>
    <nav aria-label="Footer" className="mt-2 flex flex-wrap justify-center gap-x-6"><Link href="/faq" className="inline-flex min-h-11 items-center underline underline-offset-4">FAQ</Link><Link href="/terms" className="inline-flex min-h-11 items-center underline underline-offset-4">Terms and conditions</Link></nav>
  </footer>;
}
