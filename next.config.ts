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
  "img-src 'self' blob: data:",
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
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Panel: fuera de los buscadores también por cabecera (cubre respuestas no HTML).
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
