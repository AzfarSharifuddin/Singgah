import { EditorialShell } from "@/components/brand/editorial-shell";

export default function Loading() {
  return <EditorialShell><main id="main" className="mx-auto min-h-[60vh] max-w-6xl px-6 py-16 text-hutan sm:px-8" role="status"><p className="editorial-label text-xs">Discover</p><h1 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">Finding the local stories…</h1><div aria-hidden="true" className="mt-8 h-40 rounded-sm bg-[#f1e7d6]" /></main></EditorialShell>;
}
