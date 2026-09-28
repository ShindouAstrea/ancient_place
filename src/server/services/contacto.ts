import "server-only";

import { after } from "next/server";

import { crearLead } from "@/server/repositories/leads";
import type { DatosContacto } from "@/server/validators/contacto";

import { enviarNotificacionNuevoLead } from "./correo";
import { permitirIntento } from "./rate-limit";
import { verificarTurnstile } from "./turnstile";

export type ResultadoContacto =
  { ok: true } | { ok: false; motivo: "verificacion" | "limite" | "interno" };

type Contexto = { ip: string | null; tokenTurnstile: string };

/**
 * Procesa una solicitud de contacto YA VALIDADA por Zod:
 *   Turnstile → rate limit → guardar lead → correo (después de responder).
 *
 * Regla clave: si falla el correo, el lead igual queda guardado y la persona
 * recibe una respuesta exitosa. Nunca se registran datos personales en logs.
 */
export async function procesarSolicitudContacto(
  datos: DatosContacto,
  { ip, tokenTurnstile }: Contexto,
): Promise<ResultadoContacto> {
  if (!(await verificarTurnstile(tokenTurnstile, ip, "contacto"))) {
    return { ok: false, motivo: "verificacion" };
  }

  let leadId: string;
  try {
    if (!(await permitirIntento(ip, "contacto"))) {
      return { ok: false, motivo: "limite" };
    }
    leadId = await crearLead(datos);
  } catch (error) {
    // ErrorRepositorio solo contiene la operación y el código de PostgreSQL.
    console.error("[contacto] No se pudo guardar la solicitud:", (error as Error).message);
    return { ok: false, motivo: "interno" };
  }

  // after(): el correo se envía DESPUÉS de responder al usuario, que no espera a
  // Resend. En Vercel la función se mantiene viva hasta terminar (waitUntil).
  after(async () => {
    try {
      const enviado = await enviarNotificacionNuevoLead(leadId, datos);
      if (!enviado) {
        console.warn(
          `[contacto] Lead ${leadId} guardado. Aviso por correo omitido: RESEND_API_KEY no está configurada.`,
        );
      }
    } catch (error) {
      console.error(
        `[contacto] Lead ${leadId} guardado, pero falló el correo de aviso:`,
        (error as Error).message,
      );
    }
  });

  return { ok: true };
}
