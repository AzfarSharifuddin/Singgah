import Link from "next/link";
import { vendorSession } from "@/lib/supabase/vendor";
import { logout } from "@/lib/vendor-management/actions";
export const metadata = { title: "Vendor dashboard | Singgah", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { id } = await vendorSession();
  return <div className="min-h-svh bg-[#faf8f3] text-hutan [overflow-wrap:anywhere]"><a href="#main" className="sr-only focus:not-sr-only">Skip to dashboard</a><header className="border-b border-hutan/10"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4"><Link href="/" className="min-h-11 py-2 text-xl font-bold tracking-widest">SINGGAH.</Link><form action={logout}><button className="min-h-11 rounded-xl border border-hutan/20 px-4">Sign out</button></form></div></header><div className="mx-auto max-w-6xl px-5 py-6 lg:grid lg:grid-cols-[180px_1fr] lg:gap-10"><nav aria-label="Vendor dashboard" className="mb-6 flex flex-wrap gap-2 self-start lg:sticky lg:top-6 lg:flex-col">{(id ? [["/dashboard","Overview"],["/dashboard/profile","Profile"],["/dashboard/products","Products"],["/dashboard/photos","Photos"]] : [["/dashboard/onboarding","Set up business"]]).map(([href, label]) => <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-xl border border-hutan/15 bg-white px-4 hover:bg-rembulan/40">{label}</Link>)}</nav><main id="main" className="min-w-0">{children}</main></div></div>;
}
