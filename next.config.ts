import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Orígenes de Supabase permitidos en la CSP. Se derivan de NEXT_PUBLIC_SUPABASE_URL
 * (disponible en build) para autorizar exactamente el proyecto en uso, incluido
 * el WebSocket de Realtime. Sin la variable (ej: lint) se usa el comodín de Supabase.
 */
function origenesSupabase(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return ["https://*.supabase.co", "wss://*.supabase.co"];
  const { protocol, host } = new URL(url);
  const ws = protocol === "https:" ? "wss:" : "ws:";
  return [`${protocol}//${host}`, `${ws}//${host}`];
}

const supabase = origenesSupabase();
// upgrade-insecure-requests rompería Supabase local (http) al probar la imagen en local.
const supabaseEsHttps = supabase[0]?.startsWith("https:") ?? true;

/**
 * Fotos del sitio (bucket "sitio" de Supabase Storage) que next/image puede optimizar.
 * En local Supabase corre en 127.0.0.1: next/image bloquea IPs privadas por defecto
 * (protección SSRF), así que solo en ese caso se permite.
 */
const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const fotosSupabase = urlSupabase
  ? [new URL(`${urlSupabase.replace(/\/+$/, "")}/storage/v1/object/public/sitio/**`)]
  : [];
const supabaseEsLocal = urlSupabase
  ? ["127.0.0.1", "localhost"].includes(new URL(urlSupabase).hostname)
  : false;

const TURNSTILE = "https://challenges.cloudflare.com";
const GOOGLE_MAPS = ["https://www.google.com", "https://maps.google.com"];

/**
 * Content-Security-Policy sin nonces (enfoque "Without Nonces" de la documentación
 * oficial de Next.js). Next.js inyecta scripts inline para la hidratación, por lo
 * que se requiere 'unsafe-inline' en script-src. La alternativa con nonces obliga a
 * renderizar TODAS las páginas dinámicamente (sin caché estática), lo que empeora el
 * rendimiento de una landing que es 100 % estática. 'unsafe-eval' solo en desarrollo.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${TURNSTILE}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Fotos del sitio desde Supabase Storage (next/image las sirve optimizadas desde el
  // propio dominio; el origen de Supabase cubre las vistas previas del panel).
  `img-src 'self' blob: data: ${supabase[0]}`,
  "font-src 'self'",
  `connect-src 'self' ${supabase.join(" ")} ${TURNSTILE}${isDev ? " ws: wss:" : ""}`,
  `frame-src ${TURNSTILE} ${GOOGLE_MAPS.join(" ")}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(!isDev && supabaseEsHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundante con frame-ancestors, pero cubre navegadores antiguos.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "browsing-topics=()",
    ].join(", "),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS: 2 años. Sin "preload" a propósito: es un compromiso difícil de revertir;
  // agregarlo solo cuando el dominio y todos sus subdominios sirvan HTTPS de forma estable.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  // Genera .next/standalone: servidor mínimo con solo las dependencias necesarias (Docker).
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: fotosSupabase,
    dangerouslyAllowLocalIP: supabaseEsLocal,
  },
  experimental: {
    serverActions: {
      // Subida de fotos desde el panel. El navegador ya las reduce (≤1600 px, WebP),
      // así que rara vez superan 500 KB; Vercel admite hasta 4,5 MB por petición.
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Panel: fuera de los buscadores también por cabecera (cubre respuestas no HTML).
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Su URL lleva el token del correo: que no viaje como Referer a ningún sitio.
      // (Si dos reglas definen la misma cabecera, gana la última.)
      { source: "/admin/restablecer", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      // Lo mismo para el código del QR de las fichas (/admin/p/<código>).
      { source: "/admin/p/:codigo", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
