import type { ReactNode } from "react";

export function BrandHero({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`brand-hero relative isolate overflow-hidden bg-hutan text-rembulan ${className}`}>
    <div aria-hidden="true" className="brand-floral pointer-events-none absolute inset-y-0 right-0" />
    <div className="relative mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">{children}</div>
    <div aria-hidden="true" className="brand-batik h-4" />
  </section>;
}

export function BrandDivider({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`flex items-center justify-center gap-4 text-terracotta ${className}`}>
    <span className="h-px w-16 bg-terracotta/40" />
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25">
      <path d="M12 10C7 7 8 4 12 1c4 3 5 6 0 9ZM14 12c3-5 6-4 9 0-3 4-6 5-9 0ZM12 14c5 3 4 6 0 9-4-3-5-6 0-9ZM10 12c-3 5-6 4-9 0 3-4 6-5 9 0Z" />
      <path d="m12 9 3 3-3 3-3-3Z" />
    </svg>
    <span className="h-px w-16 bg-terracotta/40" />
  </div>;
}
