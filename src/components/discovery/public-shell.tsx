import { PublicFooter } from "@/components/public-footer";
import Link from "next/link";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-[#faf8f3] text-hutan [overflow-wrap:anywhere]">
    <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to content</a>
    <header className="border-b border-hutan/10"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8"><Link href="/" aria-label="Singgah home" className="inline-flex min-h-11 items-center text-xl font-bold tracking-[0.16em]">SINGGAH<span aria-hidden="true" className="text-terracotta">.</span></Link><Link href="/discover" className="inline-flex min-h-11 items-center rounded-full border border-hutan/20 px-5 text-sm hover:bg-hutan hover:text-white">Explore vendors <span aria-hidden="true" className="ml-3">↗</span></Link></div></header>
    {children}
    <PublicFooter />
  </div>;
}
