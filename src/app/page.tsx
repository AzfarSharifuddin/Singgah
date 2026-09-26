export default function Home() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-rembulan px-6 py-16 text-hutan">
      <div className="w-full max-w-xl text-center">
        <div aria-hidden="true" className="mx-auto mb-8 flex w-16 gap-2">
          <span className="h-1 flex-1 rounded bg-terracotta" />
          <span className="h-1 flex-1 rounded bg-emas" />
        </div>
        <h1 className="text-4xl font-semibold tracking-[0.12em] sm:text-6xl">SINGGAH</h1>
        <p className="mt-5 text-lg sm:text-xl">Stories Make Places Brighter</p>
        <p className="mt-8 text-sm">Our MVP is under development. See you soon.</p>
      </div>
    </main>
  );
}
