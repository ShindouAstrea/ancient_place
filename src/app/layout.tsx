import type { Metadata, Viewport } from "next";
import { Lora, Nunito_Sans } from "next/font/google";

import { siteConfig } from "@/config/site";
import { envPublico } from "@/lib/env";
import { obtenerContenidoSitio } from "@/server/services/contenido";

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

/** Título y descripción vienen del contenido editable desde el panel. */
export async function generateMetadata(): Promise<Metadata> {
  const { config } = await obtenerContenidoSitio();
  return {
    metadataBase: new URL(envPublico.NEXT_PUBLIC_SITE_URL),
    title: { default: config.nombre, template: `%s | ${config.nombre}` },
    description: config.descripcion_corta || undefined,
  };
}

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
