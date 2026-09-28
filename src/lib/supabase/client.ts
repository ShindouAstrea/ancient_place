import { createBrowserClient } from "@supabase/ssr";

import { envPublico } from "@/lib/env";
import type { Database } from "@/types/database";

import { nombreCookieAuth } from "./config";

/**
 * Cliente de Supabase para el NAVEGADOR (Client Components).
 * Usa solo la clave publicable; la seguridad de los datos la garantiza RLS.
 * createBrowserClient reutiliza una única instancia internamente.
 */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    envPublico.NEXT_PUBLIC_SUPABASE_URL,
    envPublico.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookieOptions: { name: nombreCookieAuth } },
  );
}
