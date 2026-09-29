import { envPublico } from "@/lib/env";
import { urlFoto } from "@/lib/utils/fotos";
import { DIAS_SCHEMA } from "@/lib/utils/horario";
import type { ConfiguracionSitio } from "@/types/contenido";

/**
 * Textos para buscadores y redes sociales, armados con el contenido editable desde el
 * panel (no hay datos del negocio escritos en el código).
 */

/** Título de la portada: nombre + qué es y dónde (ej: "Hogar X | Hogar de reposo en Ñuñoa"). */
export function tituloSitio(config: ConfiguracionSitio): string {
  // Si el nombre ya dice "hogar de reposo", no se repite.
  const sufijo = /reposo/i.test(config.nombre)
    ? config.ciudad
    : config.ciudad
      ? `Hogar de reposo en ${config.ciudad}`
      : "Hogar de reposo para adultos mayores";
  return sufijo ? `${config.nombre} | ${sufijo}` : config.nombre;
}

/** Descripción breve del panel; si aún está vacía, una genérica con el nombre y el lugar. */
export function descripcionSitio(config: ConfiguracionSitio): string {
  if (config.descripcion_corta) return config.descripcion_corta;
  const lugar = [config.ciudad, config.region].filter(Boolean).join(", ");
  return `${config.nombre}: hogar de reposo para adultos mayores${lugar ? ` en ${lugar}` : ""}. Escríbenos para conocer nuestros servicios y visitarnos.`;
}

/** Datos de Open Graph comunes a todas las páginas públicas. */
export function openGraphBase(config: ConfiguracionSitio) {
  return { type: "website" as const, locale: "es_CL", siteName: config.nombre };
}

/**
 * Datos estructurados (schema.org LocalBusiness) para que Google entienda qué es el
 * hogar, dónde está, cómo contactarlo y su horario de visitas. Solo incluye lo que ya
 * está completado en el panel (JSON.stringify omite los valores undefined).
 * Probar en https://search.google.com/test/rich-results
 */
export function datosEstructuradosNegocio(config: ConfiguracionSitio) {
  const sitio = envPublico.NEXT_PUBLIC_SITE_URL;
  const tieneDireccion = Boolean(config.direccion || config.ciudad || config.region);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${sitio}/#hogar`,
    name: config.nombre,
    description: descripcionSitio(config),
    url: sitio,
    image: config.hero_foto ? urlFoto(config.hero_foto) : undefined,
    telephone: config.telefono || config.whatsapp || undefined,
    email: config.email_contacto || undefined,
    address: tieneDireccion
      ? {
          "@type": "PostalAddress",
          streetAddress: config.direccion || undefined,
          addressLocality: config.ciudad || undefined,
          addressRegion: config.region || undefined,
          addressCountry: "CL",
        }
      : undefined,
    hasMap: config.maps_url || undefined,
    openingHoursSpecification: config.horario_tramos.length
      ? config.horario_tramos.map((tramo) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: tramo.dias.map((dia) => DIAS_SCHEMA[dia]),
          opens: tramo.desde,
          closes: tramo.hasta,
        }))
      : undefined,
  };
}
