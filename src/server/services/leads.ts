import "server-only";

import {
  actualizarEstadoLead,
  contarLeadsPorEstado,
  listarLeads,
} from "@/server/repositories/leads";
import type { EstadoLead, FiltroLeads } from "@/server/validators/leads";

import { requerirRol } from "./auth";

export type { LeadPanel } from "@/server/repositories/leads";

export const LEADS_POR_PAGINA = 20;

/**
 * Página de leads para el panel. La página pedida se ajusta al rango válido
 * (ej: ?pagina=999 muestra la última), para no consultar fuera de los resultados.
 */
export async function obtenerPaginaLeads(filtro: FiltroLeads) {
  await requerirRol("sitio");

  const conteo = await contarLeadsPorEstado();
  const totalFiltrado = filtro.estado ? conteo[filtro.estado] : conteo.total;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / LEADS_POR_PAGINA));
  const pagina = Math.min(filtro.pagina, totalPaginas);

  const leads =
    totalFiltrado === 0
      ? []
      : await listarLeads({
          estado: filtro.estado,
          desde: (pagina - 1) * LEADS_POR_PAGINA,
          cantidad: LEADS_POR_PAGINA,
        });

  return { leads, conteo, pagina, totalPaginas };
}

/** Cantidades por estado para la página de inicio del panel. */
export async function obtenerResumenLeads() {
  await requerirRol("sitio");
  return contarLeadsPorEstado();
}

/** Cambia el estado de un lead. false si no se modificó (no existe o sin permiso). */
export async function cambiarEstadoLead(id: string, estado: EstadoLead): Promise<boolean> {
  await requerirRol("sitio");
  return actualizarEstadoLead(id, estado);
}
