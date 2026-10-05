"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <div className="max-w-lg"><h1 className="font-serif text-3xl">Admin could not load</h1><p className="my-5 leading-7">We could not check your access or load the vendor list. Retry, or contact Singgah if the problem continues.</p><button onClick={reset} className="min-h-12 rounded-xl bg-hutan px-5 text-white">Try again</button></div>;
}
