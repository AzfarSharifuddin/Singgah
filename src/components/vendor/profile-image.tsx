"use client";

import Image from "next/image";
import { useState } from "react";

export function ProfileImage({ src, alt, className = "", sizes, priority = false, initials }: {
  src: string | null; alt: string; className?: string; sizes: string; priority?: boolean; initials?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <div className={`relative overflow-hidden bg-[#f0e8da] ${className}`}>
      {src && failedSource !== src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority}
          className="object-cover" onError={() => setFailedSource(src)} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-hutan/65">
          {initials ? <span role="img" aria-label={alt} className="font-serif text-3xl">{initials}</span> : <>
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="4" y="5" width="24" height="22" rx="4" /><circle cx="12" cy="12" r="2" />
              <path d="m5 24 7-7 5 4 4-6 6 9" />
            </svg>
            <span className="text-xs">Photo coming soon</span>
          </>}
        </div>
      )}
    </div>
  );
}
