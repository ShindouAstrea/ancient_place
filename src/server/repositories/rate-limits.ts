import "server-only";

import { envServidor } from "@/lib/env";
import { crearClienteServidor } from "@/lib/supabase/server";

import { ErrorRepositorio } from "./errores";

/** Acciones con límite definidas en la función SQL `verificar_rate_limit`. */
export type AccionLimitada = "contacto";

/**
 * Registra un intento y devuelve true si está dentro del límite.
 * El límite (5 por hora para "contacto") vive en la base de datos, no aquí.
 */
export async function registrarIntento(ipHash: string, accion: AccionLimitada): Promise<boolean> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc("verificar_rate_limit", {
    p_secreto: envServidor().SUPABASE_FORMULARIO_SECRETO,
    p_ip_hash: ipHash,
    p_accion: accion,
  });

  if (error || typeof data !== "boolean") {
    throw new ErrorRepositorio("verificar_rate_limit", error?.code);
  }
  return data;
}
