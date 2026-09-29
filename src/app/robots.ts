import type { MetadataRoute } from "next";

import { envPublico } from "@/lib/env";

/**
 * /robots.txt: pide a los buscadores no rastrear el panel ni la API.
 *
 * Es solo una petición (cualquiera puede leer este archivo): la protección real del
 * panel es el inicio de sesión + RLS, y queda fuera de los resultados por la metadata y
 * la cabecera X-Robots-Tag "noindex" (next.config.ts).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${envPublico.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
