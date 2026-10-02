import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { envPublico, envServidor } from "@/lib/env";
import type { Database } from "@/types/database";

import { COOKIE_SESION_TEMPORAL, duracionSegunModo, opcionesCookieAuth } from "./config";

/**
 * Cliente de Supabase para código de SERVIDOR (Server Components, Server Actions,
 * Route Handlers). Usa la clave publicable: actúa como `anon`, o como
 * `authenticated` si hay sesión en las cookies. Los permisos los decide RLS.
 *
 * Crear uno nuevo por petición (nunca compartirlo en una variable global).
 * Solo debe importarse desde `server/repositories` (ver arquitectura en el README).
 *
 * sesionTemporal: si las cookies de sesión que escriba deben borrarse al cerrar el
 * navegador. Por defecto lo indica la cookie COOKIE_SESION_TEMPORAL; el inicio de sesión
 * lo pasa explícitamente, porque en esa misma petición recién se escribe la marca.
 */
export async function crearClienteServidor(opciones?: { sesionTemporal?: boolean }) {
  const almacenCookies = await cookies();
  const sesionTemporal = opciones?.sesionTemporal ?? almacenCookies.has(COOKIE_SESION_TEMPORAL);
  const url = envServidor().SUPABASE_INTERNAL_URL ?? envPublico.NEXT_PUBLIC_SUPABASE_URL;

  return createServerClient<Database>(url, envPublico.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: opcionesCookieAuth,
    cookies: {
      getAll() {
        return almacenCookies.getAll();
      },
      setAll(cookiesAGuardar) {
        try {
          cookiesAGuardar.forEach(({ name, value, options }) =>
            almacenCookies.set(name, value, duracionSegunModo(options, sesionTemporal)),
          );
        } catch {
          // Los Server Components no pueden escribir cookies. Es seguro ignorarlo:
          // el proxy (lib/supabase/middleware.ts) ya renueva la sesión en cada petición.
        }
      },
    },
  });
}
