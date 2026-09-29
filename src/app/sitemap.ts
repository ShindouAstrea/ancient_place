import type { MetadataRoute } from "next";

import { envPublico } from "@/lib/env";

/**
 * /sitemap.xml: las páginas públicas. Sin lastModified: una fecha inexacta hace que
 * Google ignore el dato; es mejor omitirla.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const sitio = envPublico.NEXT_PUBLIC_SITE_URL;
  return [
    { url: sitio, changeFrequency: "monthly", priority: 1 },
    { url: `${sitio}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
