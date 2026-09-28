import { createBrowserClient } from "@supabase/ssr";

import { envPublico } from "@/lib/env";
import type { Database } from "@/types/database";

import { opcionesCookieAuth } from "./config";

/**
 * Cliente de Supabase para el NAVEGADOR (Client Components).
 *
 * Actúa siempre como `anon`: la sesión de administración vive en cookies httpOnly
 * que el JavaScript del navegador no puede leer (ver config.ts), y toda la
 * autenticación ocurre en el servidor. Reservado para datos públicos futuros;
 * la seguridad la garantiza RLS.
 */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    envPublico.NEXT_PUBLIC_SUPABASE_URL,
    envPublico.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookieOptions: { name: opcionesCookieAuth.name } },
  );
}
