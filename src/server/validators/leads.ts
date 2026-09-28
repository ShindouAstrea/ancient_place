import { z } from "zod";

import { Constants, type Database } from "@/types/database";

export type EstadoLead = Database["public"]["Enums"]["estado_lead"];

/** Estados posibles, tomados del enum de la base de datos (tipos generados). */
export const ESTADOS_LEAD = Constants.public.Enums.estado_lead;

export const ETIQUETAS_ESTADO: Record<EstadoLead, { singular: string; plural: string }> = {
  nuevo: { singular: "Nuevo", plural: "Nuevos" },
  contactado: { singular: "Contactado", plural: "Contactados" },
  descartado: { singular: "Descartado", plural: "Descartados" },
};

/** Primer valor de un parámetro de la URL (?estado=nuevo&estado=otro → "nuevo"). */
function primero(valor: unknown) {
  return Array.isArray(valor) ? valor[0] : valor;
}

/**
 * Filtros del listado desde la URL. Nunca falla: un valor inválido se reemplaza
 * por el valor por defecto (la URL la puede escribir cualquiera).
 */
export const esquemaFiltroLeads = z.object({
  estado: z.preprocess(primero, z.enum(ESTADOS_LEAD).optional()).catch(undefined),
  pagina: z.preprocess(primero, z.coerce.number().int().min(1).max(10_000)).catch(1),
});

export type FiltroLeads = z.output<typeof esquemaFiltroLeads>;

/** Cambio de estado de un lead (Server Action: se valida como cualquier endpoint público). */
export const esquemaCambioEstado = z.object({
  id: z.uuid(),
  estado: z.enum(ESTADOS_LEAD),
});
