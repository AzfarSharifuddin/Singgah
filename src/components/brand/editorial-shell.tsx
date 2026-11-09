import type { ReactNode } from "react";
import localFont from "next/font/local";
import { PublicShell } from "@/components/discovery/public-shell";

const editorialFont = localFont({
  src: "../../app/fonts/eb-garamond-latin-regular.woff2",
  variable: "--font-editorial",
  weight: "400",
  style: "normal",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export function EditorialShell({ children }: { children: ReactNode }) {
  return <PublicShell editorial className={editorialFont.variable}>{children}</PublicShell>;
}
