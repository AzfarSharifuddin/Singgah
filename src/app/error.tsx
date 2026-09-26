"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 text-center text-hutan"><h1 className="font-serif text-4xl">A little pause.</h1><p className="mt-4 leading-7">We couldn’t load the local stories right now. Please try again in a moment.</p><button onClick={reset} className="mt-6 min-h-12 rounded-full bg-hutan px-6 text-sm text-white">Try again</button><Link href="/" className="mt-3 inline-flex min-h-11 items-center justify-center text-sm underline">Back to Singgah</Link></main>;
}
