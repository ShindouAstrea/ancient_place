import type { Metadata, Viewport } from "next";
import { Lora, Nunito_Sans } from "next/font/google";

import { siteConfig } from "@/config/site";
import { envPublico } from "@/lib/env";

import "./globals.css";

// next/font descarga las fuentes en build y las sirve desde el propio dominio
// (compatible con la CSP font-src 'self' y sin peticiones a Google en runtime).
const fuenteTexto = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
});

// Serif cálida solo para títulos.
const fuenteTitulos = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
});

export const metadata: Metadata = {
  metadataBase: new URL(envPublico.NEXT_PUBLIC_SITE_URL),
  title: {
    default: siteConfig.nombre,
    template: `%s | ${siteConfig.nombre}`,
  },
  description: siteConfig.descripcionCorta,
};

export const viewport: Viewport = {
  themeColor: "#fbf7f0",
  // Necesario para que env(safe-area-inset-*) funcione en iPhone.
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={siteConfig.idioma} className={`${fuenteTexto.variable} ${fuenteTitulos.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
