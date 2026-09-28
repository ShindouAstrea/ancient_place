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
