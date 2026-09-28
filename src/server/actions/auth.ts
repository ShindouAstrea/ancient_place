"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { obtenerIpCliente } from "@/lib/utils/ip";
import {
  cerrarSesionActual,
  confirmarEnlaceAcceso,
  solicitarEnlaceAcceso,
} from "@/server/services/auth";
import {
  esquemaConfirmacionAcceso,
  esquemaSolicitudAcceso,
  type EstadoSolicitudAcceso,
} from "@/server/validators/auth";
import { CAMPO_TURNSTILE } from "@/server/validators/contacto";

const MENSAJES_ERROR = {
  verificacion:
    "No pudimos confirmar la verificación de seguridad. Por favor, inténtalo nuevamente.",
  limite: "Hiciste muchos intentos en poco tiempo. Espera un rato y vuelve a intentarlo.",
  interno: "Tuvimos un problema al procesar tu solicitud. Inténtalo en unos minutos.",
} as const;

/** Solicitud de enlace de acceso (formulario de /admin/login). */
export async function solicitarAcceso(
  _estadoAnterior: EstadoSolicitudAcceso,
  formData: FormData,
): Promise<EstadoSolicitudAcceso> {
  const email = formData.get("email");
  const validacion = esquemaSolicitudAcceso.safeParse({
    email: typeof email === "string" ? email : "",
  });
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: "Revisa el correo ingresado.",
      errorEmail: validacion.error.issues[0]?.message,
    };
  }

  const token = formData.get(CAMPO_TURNSTILE);
  const resultado = await solicitarEnlaceAcceso(
    validacion.data.email,
    typeof token === "string" ? token : "",
    obtenerIpCliente(await headers()),
  );

  return resultado.ok
    ? { estado: "enviado" }
    : { estado: "error", mensaje: MENSAJES_ERROR[resultado.motivo] };
}

/** Confirmación del enlace del correo (botón de /admin/confirmar). */
export async function confirmarAcceso(formData: FormData): Promise<void> {
  const validacion = esquemaConfirmacionAcceso.safeParse({
    token_hash: formData.get("token_hash"),
    type: formData.get("type"),
  });
  if (!validacion.success) redirect("/admin/login?motivo=enlace-invalido");

  const resultado = await confirmarEnlaceAcceso(validacion.data.token_hash);
  redirect(resultado === "admin" ? "/admin" : `/admin/login?motivo=${resultado}`);
}

/** Cerrar sesión (siempre por POST: un enlace GET podría activarse sin querer). */
export async function salir(): Promise<void> {
  await cerrarSesionActual();
  redirect("/admin/login?motivo=sesion-cerrada");
}
