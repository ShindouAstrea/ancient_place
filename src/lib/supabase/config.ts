import type { CookieOptionsWithName } from "@supabase/ssr";

import { envPublico } from "@/lib/env";

/**
 * Opciones de la cookie de sesión de Supabase Auth, comunes a TODOS los clientes.
 */
export const opcionesCookieAuth: CookieOptionsWithName = {
  /**
   * Nombre fijo. Por defecto @supabase/ssr lo deriva de la URL del proyecto; en
   * Docker el servidor usa SUPABASE_INTERNAL_URL y el navegador 127.0.0.1, y cada uno
   * calcularía un nombre distinto. Mismo formato que el valor por defecto.
   */
  name: `sb-${new URL(envPublico.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0]}-auth-token`,
  /**
   * httpOnly: el JavaScript del navegador NO puede leer el token de sesión, lo que
   * impide robarlo mediante un ataque XSS. Es posible porque toda la autenticación
   * ocurre en el servidor (Server Actions y proxy); el navegador nunca la necesita.
   */
  httpOnly: true,
  // Solo por HTTPS cuando el sitio se sirve con HTTPS (en local es http://localhost).
  secure: envPublico.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
  sameSite: "lax",
  path: "/",
};

/**
 * Con «Recordar mis datos en este dispositivo»: la sesión dura 30 días desde el último uso
 * (cada renovación del token, al menos cada hora de uso, vuelve a escribir la cookie).
 * @supabase/ssr usaría 400 días.
 */
export const DURACION_SESION_RECORDADA = 30 * 24 * 60 * 60;

/**
 * Marca de una sesión SIN «Recordar mis datos»: mientras exista, las cookies de Auth se
 * escriben sin vencimiento (cookies de sesión) y el navegador las borra al cerrarse. Ella
 * misma es una cookie de sesión.
 */
export const COOKIE_SESION_TEMPORAL = "panel-sesion-temporal";

/**
 * Ajusta la duración de cada cookie de Auth que escribe @supabase/ssr según el modo de la
 * sesión. Las que se borran (maxAge 0, al cerrar sesión) no se tocan.
 */
export function duracionSegunModo<T extends { maxAge?: number; expires?: Date }>(
  opciones: T,
  sesionTemporal: boolean,
): T {
  if (opciones.maxAge === 0) return opciones;
  if (!sesionTemporal) return { ...opciones, maxAge: DURACION_SESION_RECORDADA };
  const { maxAge: _maxAge, expires: _expires, ...sinVencimiento } = opciones;
  return sinVencimiento as T;
}
