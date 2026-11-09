import Image from "next/image";
import type { ReactNode } from "react";
import { EditorialShell } from "@/components/brand/editorial-shell";

const defaultPhoto = {
  src: "/images/editorial/neighbourhood-shop.webp",
  alt: "A neighbourhood shop shaded by trees, with a passer-by walking along the pavement.",
};

export function VendorAuthLayout({ title, description, children, photo = defaultPhoto }: { title: string; description: string; children: ReactNode; photo?: { src: string; alt: string } }) {
  return <EditorialShell>
    <main id="main" className="grid lg:min-h-[calc(100svh-5.25rem)] lg:grid-cols-2">
      <div className="mx-auto w-full max-w-xl px-6 py-12 sm:px-10 sm:py-16 lg:order-2 lg:self-center lg:px-12">
        <h1 className="font-serif text-5xl leading-[1.05] sm:text-6xl">{title}</h1>
        <p className="mb-8 mt-5 text-xl leading-relaxed sm:text-2xl">{description}</p>
        {children}
      </div>
      <div className="relative isolate aspect-[4/3] w-full overflow-hidden lg:order-1 lg:aspect-auto">
        <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 1023px) 100vw, 50vw" className="object-cover object-[50%_62%]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/55" />
      </div>
    </main>
  </EditorialShell>;
}
