import { envPublico } from "@/lib/env";

/**
 * Nombre de la cookie de sesión de Supabase Auth, común a TODOS los clientes.
 *
 * Por defecto @supabase/ssr lo deriva de la URL del proyecto. Cuando la app corre
 * en Docker, el servidor usa SUPABASE_INTERNAL_URL (host.docker.internal) y el
 * navegador 127.0.0.1: cada uno calcularía un nombre distinto y la sesión no se
 * compartiría. Fijarlo a partir de la URL PÚBLICA evita ese problema.
 * (Mismo formato que el valor por defecto: "sb-<referencia>-auth-token".)
 */
export const nombreCookieAuth = `sb-${
  new URL(envPublico.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]
}-auth-token`;
