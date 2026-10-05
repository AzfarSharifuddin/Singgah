import Link from "next/link";
export const metadata = { title: "Admin | Singgah", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-svh bg-[#faf8f3] text-hutan [overflow-wrap:anywhere]">
    <a href="#main" className="sr-only focus:not-sr-only">Skip to admin</a>
    <header className="border-b border-hutan/15"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4"><Link href="/" className="min-h-11 py-2 text-xl font-bold tracking-widest">SINGGAH.</Link><Link href="/admin" className="min-h-11 py-3 text-sm underline underline-offset-4">Admin</Link></div></header>
    <main id="main" className="mx-auto max-w-6xl px-5 py-8 sm:py-12">{children}</main>
  </div>;
}
