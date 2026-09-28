import "server-only";

import { createClient } from "@supabase/supabase-js";

import { envPublico, envServidor } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase SIN cookies ni sesión persistente, solo para comprobar una
 * contraseña (ej: la contraseña actual antes de cambiarla) sin tocar la sesión del
 * navegador. Quien lo use debe cerrar la sesión temporal con signOut({ scope: "local" }).
 */
export function crearClienteVerificacion() {
  const url = envServidor().SUPABASE_INTERNAL_URL ?? envPublico.NEXT_PUBLIC_SUPABASE_URL;
  return createClient<Database>(url, envPublico.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
