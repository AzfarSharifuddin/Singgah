import Image from "next/image";
import type { ReactNode } from "react";
import { EditorialShell } from "@/components/brand/editorial-shell";

export function VendorAuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <EditorialShell>
    <main id="main" className="mx-auto grid max-w-6xl items-start gap-12 px-6 py-12 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
      <div className="mx-auto w-full max-w-md lg:order-2">
        <h1 className="font-serif text-5xl leading-[1.05] sm:text-6xl">{title}</h1>
        <p className="mb-8 mt-5 text-xl leading-relaxed sm:text-2xl">{description}</p>
        {children}
      </div>
      <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden lg:order-1 lg:aspect-[4/5] lg:max-w-none">
        <Image src="/images/editorial/neighbourhood-shop.webp" alt="A neighbourhood shop shaded by trees, with a passer-by walking along the pavement." fill sizes="(max-width: 767px) calc(100vw - 48px), (max-width: 1023px) 448px, (max-width: 1151px) 46vw, 520px" className="object-cover object-[50%_62%]" />
      </div>
    </main>
  </EditorialShell>;
}
