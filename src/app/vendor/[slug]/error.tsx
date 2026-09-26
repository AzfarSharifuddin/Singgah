"use client";

export default function VendorError({ reset }: { reset: () => void }) {
  return <main className="flex min-h-svh items-center justify-center px-6 text-hutan"><div className="max-w-md text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em]">Singgah</p><h1 className="mt-5 font-serif text-4xl">A little pause.</h1><p className="mt-4 leading-7">We couldn’t load this vendor right now. Please try again in a moment.</p><button onClick={reset} className="mt-7 min-h-12 rounded-full bg-hutan px-6 text-sm font-semibold text-white">Try again</button></div></main>;
}
