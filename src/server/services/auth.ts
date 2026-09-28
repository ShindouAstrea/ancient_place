import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import {
  cerrarSesion,
  enviarEnlaceMagico,
  iniciarSesionConEnlace,
  obtenerSesionActual,
  type Administrador,
} from "@/server/repositories/auth";

import { permitirIntento } from "./rate-limit";

/**
 * Capa de acceso a datos (DAL) de la autenticación del panel.
 *
 * Los layouts NO se vuelven a ejecutar al navegar entre páginas, por lo que no
 * bastan para proteger datos: cada página, servicio y Server Action del panel debe
 * llamar a `requerirAdmin()`. RLS lo vuelve a exigir en la base de datos.
 */

/** Sesión actual, memoizada durante una misma petición (layout + página = 1 consulta). */
export const obtenerSesion = cache(obtenerSesionActual);

/** Exige un administrador; si no lo hay, redirige al login (nunca devuelve null). */
export async function requerirAdmin(): Promise<Administrador> {
  const sesion = await obtenerSesion();
  if (!sesion.activa) redirect("/admin/login?motivo=sesion-requerida");
  if (!sesion.admin) redirect("/admin/login?motivo=sin-acceso");
  return sesion.admin;
}

export type ResultadoSolicitudAcceso =
  { ok: true } | { ok: false; motivo: "verificacion" | "limite" | "interno" };

/**
 * Solicita un enlace de acceso para `email`.
 *
 * Para no revelar qué correos tienen acceso al panel, la respuesta es la misma
 * exista o no el usuario. Solo se informan los errores que no dependen del correo:
 * la verificación antispam y el límite de intentos por conexión.
 */
export async function solicitarEnlaceAcceso(
  email: string,
  tokenCaptcha: string,
  ip: string | null,
): Promise<ResultadoSolicitudAcceso> {
  try {
    if (!(await permitirIntento(ip, "login"))) return { ok: false, motivo: "limite" };
  } catch (error) {
    console.error("[acceso] No se pudo verificar el límite de intentos:", (error as Error).message);
    return { ok: false, motivo: "interno" };
  }

  const error = await enviarEnlaceMagico(email, tokenCaptcha);
  if (!error) return { ok: true };
  if (error.codigo === "captcha_failed") return { ok: false, motivo: "verificacion" };

  // Correo sin cuenta, límite de envíos de Supabase, etc.: se registra solo el código.
  console.warn("[acceso] No se envió el enlace de acceso:", error.codigo);
  return { ok: true };
}

/** Canjea el enlace del correo. Solo un administrador queda con sesión iniciada. */
export function confirmarEnlaceAcceso(tokenHash: string) {
  return iniciarSesionConEnlace(tokenHash);
}

export function cerrarSesionActual() {
  return cerrarSesion();
}
