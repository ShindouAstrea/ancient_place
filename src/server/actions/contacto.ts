"use server";

import { headers } from "next/headers";

import { obtenerIpCliente } from "@/lib/utils/ip";
import { procesarSolicitudContacto } from "@/server/services/contacto";
import {
  CAMPO_TRAMPA,
  CAMPO_TURNSTILE,
  erroresPorCampo,
  esquemaContacto,
  leerFormularioContacto,
  type EstadoFormularioContacto,
} from "@/server/validators/contacto";

const MENSAJES_ERROR = {
  verificacion:
    "No pudimos confirmar la verificación de seguridad. Por favor, inténtalo nuevamente.",
  limite:
    "Recibimos varias solicitudes desde tu conexión en poco tiempo. Por favor, inténtalo más tarde o escríbenos por WhatsApp.",
  interno:
    "Tuvimos un problema al enviar tu solicitud. Por favor, inténtalo en unos minutos o escríbenos por WhatsApp.",
} as const;

/**
 * Controlador del formulario de contacto: solo valida y delega en el servicio.
 * (Next.js protege las Server Actions contra CSRF verificando el origen.)
 */
export async function enviarContacto(
  _estadoAnterior: EstadoFormularioContacto,
  formData: FormData,
): Promise<EstadoFormularioContacto> {
  // Honeypot: si un bot completó el campo invisible, se simula éxito sin guardar
  // nada, para no darle pistas de que fue detectado.
  const trampa = formData.get(CAMPO_TRAMPA);
  if (typeof trampa === "string" && trampa.trim() !== "") {
    return { estado: "exito" };
  }

  const validacion = esquemaContacto.safeParse(leerFormularioContacto(formData));
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: "Revisa los campos marcados.",
      errores: erroresPorCampo(validacion.error),
    };
  }

  const token = formData.get(CAMPO_TURNSTILE);
  const resultado = await procesarSolicitudContacto(validacion.data, {
    ip: obtenerIpCliente(await headers()),
    tokenTurnstile: typeof token === "string" ? token : "",
  });

  return resultado.ok
    ? { estado: "exito" }
    : { estado: "error", mensaje: MENSAJES_ERROR[resultado.motivo] };
}
