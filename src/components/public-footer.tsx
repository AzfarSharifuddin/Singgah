import Link from "next/link";

export function PublicFooter() {
  return <footer className="mt-12 border-t border-hutan/10 px-5 py-8 text-center text-xs text-[#5d665f]">
    <p>Singgah · Stories Make Places Brighter</p>
    <nav aria-label="Footer" className="mt-2 flex flex-wrap justify-center gap-x-6"><Link href="/faq" className="inline-flex min-h-11 items-center underline underline-offset-4">FAQ</Link><Link href="/terms" className="inline-flex min-h-11 items-center underline underline-offset-4">Terms and conditions</Link></nav>
  </footer>;
}
