import Link from "next/link";
import { adminSession } from "@/lib/admin/session";
import { adminLogout } from "@/lib/admin/actions";
import { vendorStatuses } from "@/lib/admin/validation";
import { ModerationForm } from "@/components/admin/moderation-form";

export default async function Admin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const { client, user } = await adminSession();
  const params = await searchParams;
  const status = vendorStatuses.find(value => value === params.status) ?? "pending";
  const search = (typeof params.q === "string" ? params.q : "").trim().slice(0, 100);
  const parsedPage = Number(params.page);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 1000000) : 1;
  const { data, error } = await client.rpc("admin_vendor_list", { p_status: status, p_search: search, p_page: page });
  if (error || !data) throw new Error("Vendor applications could not be loaded. Please retry.");
  const label = (value: string) => value === "suspended" ? "Rejected / suspended" : value[0].toUpperCase() + value.slice(1);
  const pageUrl = (value: number) => `/admin?${new URLSearchParams({ status, q: search, page: String(value) })}`;
  return <>
    <div className="flex flex-wrap items-start justify-between gap-5"><div><h1 className="font-serif text-4xl sm:text-5xl">Vendor applications</h1><p className="mt-4 text-sm">Signed in as {user.email}</p></div><form action={adminLogout}><button className="min-h-12 rounded-xl border border-hutan/25 px-5 hover:bg-rembulan/40">Sign out</button></form></div>
    <p className="mt-6 max-w-2xl leading-7">Review each business before making it public. Rejected businesses stay hidden; owners can still update their profiles.</p>
    <form method="get" action="/admin" className="my-8 grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
      <label className="text-sm">Search business name<input name="q" defaultValue={search} maxLength={100} type="search" className="mt-2 min-h-12 w-full rounded-xl border border-hutan/25 bg-white px-3" /></label>
      <label className="text-sm">Status<select name="status" defaultValue={status} className="mt-2 min-h-12 w-full rounded-xl border border-hutan/25 bg-white px-3">{vendorStatuses.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <button className="min-h-12 rounded-xl bg-hutan px-6 font-semibold text-white hover:bg-[#28523e]">Apply filters</button>
    </form>
    <p className="border-b border-hutan/20 pb-4 text-sm tabular-nums">{data.total} {data.total === 1 ? "business" : "businesses"} · Page {data.page} of {data.pages}</p>
    {data.vendors.length ? <div>{data.vendors.map(vendor => <section key={`${vendor.id}-${vendor.status}`} className="border-b border-hutan/15 py-7" aria-labelledby={`vendor-${vendor.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id={`vendor-${vendor.id}`} className="font-serif text-2xl">{vendor.name}</h2><p className="mt-2 text-sm leading-6">{vendor.category} · {vendor.city}, {vendor.state}</p></div><span className="rounded-full border border-hutan/20 px-3 py-2 text-sm">{label(vendor.status)}{!vendor.is_active && " · Inactive"}</span></div>
      <p className="mt-3 text-sm tabular-nums">Submitted {new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(vendor.created_at))}</p>
      {vendor.description && <p className="mt-3 max-w-[70ch] whitespace-pre-line leading-7">{vendor.description}</p>}
      {vendor.last_reason && <p className="mt-3 text-sm leading-6">Latest decision reason: {vendor.last_reason}</p>}
      {vendor.status === "published" && vendor.is_active && <Link href={`/vendor/${vendor.slug}`} className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Open public profile</Link>}
      {!["draft", "archived"].includes(vendor.status) && <ModerationForm id={vendor.id} status={vendor.status} />}
    </section>)}</div> : <p className="py-12 leading-7">No businesses match these filters. <Link href="/admin?status=all" className="underline underline-offset-4">View all vendors</Link>.</p>}
    <nav aria-label="Vendor pages" className="mt-7 flex flex-wrap gap-5">{data.page > 1 && <Link href={pageUrl(data.page - 1)} className="inline-flex min-h-12 items-center rounded-xl border border-hutan/25 px-5">Previous</Link>}{data.page < data.pages && <Link href={pageUrl(data.page + 1)} className="inline-flex min-h-12 items-center rounded-xl border border-hutan/25 px-5">Next</Link>}</nav>
  </>;
}
