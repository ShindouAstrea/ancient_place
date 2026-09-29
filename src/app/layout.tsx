import type { Metadata, Viewport } from "next";
import { Lora, Nunito_Sans } from "next/font/google";

import { siteConfig } from "@/config/site";
import { envPublico } from "@/lib/env";
import { descripcionSitio, openGraphBase, tituloSitio } from "@/lib/seo";
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

/**
 * Metadata base (buscadores y vista previa al compartir en WhatsApp o redes). Los
 * textos vienen del contenido editable desde el panel. La imagen para compartir es
 * app/(publico)/opengraph-image.tsx y el ícono, app/icon.svg y app/apple-icon.tsx.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { config } = await obtenerContenidoSitio();
  const titulo = tituloSitio(config);
  const descripcion = descripcionSitio(config);
  return {
    // Base de las URL absolutas (canonical, Open Graph): el dominio definitivo.
    metadataBase: new URL(envPublico.NEXT_PUBLIC_SITE_URL),
    title: { default: titulo, template: `%s | ${config.nombre}` },
    description: descripcion,
    applicationName: config.nombre,
    openGraph: { ...openGraphBase(config), title: titulo, description: descripcion, url: "/" },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion },
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
