"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { cambiarEstadoLead } from "@/server/services/leads";
import { esquemaCambioEstado } from "@/server/validators/leads";

/**
 * Cambia el estado de un lead desde el panel. Como toda Server Action, es un
 * endpoint público: valida la entrada y el servicio exige un administrador.
 */
export async function cambiarEstadoLeadAccion(
  id: string,
  estado: string,
): Promise<{ ok: boolean }> {
  const validacion = esquemaCambioEstado.safeParse({ id, estado });
  if (!validacion.success) return { ok: false };

  try {
    const ok = await cambiarEstadoLead(validacion.data.id, validacion.data.estado);
    // Vuelve a renderizar la página actual con los datos nuevos (contadores, filtros).
    if (ok) refresh();
    return { ok };
  } catch (error) {
    // Deja pasar la redirección al login si la sesión venció.
    unstable_rethrow(error);
    console.error("[panel] No se pudo cambiar el estado:", (error as Error).message);
    return { ok: false };
  }
}
