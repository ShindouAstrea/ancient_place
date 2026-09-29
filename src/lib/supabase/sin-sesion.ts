import "server-only";

import { createClient } from "@supabase/supabase-js";

import { envPublico } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase SIN cookies ni sesión persistente (actúa como `anon`). Usos:
 * - Leer el contenido público del sitio: al no tocar cookies, las páginas públicas
 *   siguen siendo estáticas (rápidas y cacheables).
 * - Comprobar una contraseña (ej: la actual antes de cambiarla) sin tocar la sesión
 *   del navegador. Quien lo use así debe cerrar la sesión temporal con
 *   signOut({ scope: "local" }).
 */
export function crearClienteSinSesion() {
  // Solo la variable opcional SUPABASE_INTERNAL_URL (no envServidor(), que exige todos los
  // secretos): así el contenido también se puede leer durante el build, sin secretos.
  const url = process.env.SUPABASE_INTERNAL_URL || envPublico.NEXT_PUBLIC_SUPABASE_URL;
  return createClient<Database>(url, envPublico.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
