/* eslint-disable @next/next/no-img-element -- Private signed URLs must bypass Next's image optimizer. */

export function PrivateProofImage({ src, alt, className = "" }: { src: string | null | undefined; alt: string; className?: string }) {
  return <div className={`relative overflow-hidden bg-[#f0e8da] ${className}`}>
    {src
      ? <img src={src} alt={alt} className="h-full w-full object-cover" />
      : <div role="status" className="flex h-full items-center justify-center p-4 text-sm text-hutan/70">Photo unavailable. Refresh to reopen it.</div>}
  </div>;
}
