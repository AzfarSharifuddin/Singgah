import Link from "next/link";

export default function VendorNotFound() {
  return <main className="flex min-h-svh items-center justify-center px-6 text-hutan"><div className="max-w-md text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em]">Singgah · 404</p><h1 className="mt-5 font-serif text-4xl">This place isn’t here.</h1><p className="mt-4 leading-7">The vendor may be unavailable, or the link may be incorrect.</p><Link href="/" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-hutan px-6 text-sm font-semibold text-white">Back to Singgah</Link></div></main>;
}
