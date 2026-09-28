import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { envPublico, envServidor } from "@/lib/env";
import type { Database } from "@/types/database";

import { nombreCookieAuth } from "./config";

/**
 * Cliente de Supabase para código de SERVIDOR (Server Components, Server Actions,
 * Route Handlers). Usa la clave publicable: actúa como `anon`, o como
 * `authenticated` si hay sesión en las cookies. Los permisos los decide RLS.
 *
 * Crear uno nuevo por petición (nunca compartirlo en una variable global).
 * Solo debe importarse desde `server/repositories` (ver arquitectura en el README).
 */
export async function crearClienteServidor() {
  const almacenCookies = await cookies();
  const url = envServidor().SUPABASE_INTERNAL_URL ?? envPublico.NEXT_PUBLIC_SUPABASE_URL;

  return createServerClient<Database>(url, envPublico.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { name: nombreCookieAuth },
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesAGuardar) {
        try {
          cookiesAGuardar.forEach(({ name, value, options }) =>
            almacenCookies.set(name, value, options),
          );
        } catch {
          // Los Server Components no pueden escribir cookies. Es seguro ignorarlo:
          // el proxy (lib/supabase/middleware.ts) ya renueva la sesión en cada petición.
        }
      },
    },
  });
}
