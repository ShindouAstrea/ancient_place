import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import {
  cambiarContrasena,
  cerrarSesion,
  iniciarSesionConContrasena,
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

export type MotivoFalloInicioSesion =
  "credenciales" | "sin-acceso" | "no-confirmada" | "verificacion" | "limite" | "interno";

/**
 * Inicio de sesión con correo y contraseña.
 *
 * Capas: límite de intentos por IP (10 por hora, frena ataques de fuerza bruta),
 * CAPTCHA opcional verificado por Supabase, y mensaje genérico ante credenciales
 * inválidas (no revela si el correo existe).
 */
export async function iniciarSesion(
  email: string,
  contrasena: string,
  tokenCaptcha: string,
  ip: string | null,
): Promise<{ ok: true } | { ok: false; motivo: MotivoFalloInicioSesion }> {
  try {
    if (!(await permitirIntento(ip, "login"))) return { ok: false, motivo: "limite" };
  } catch (error) {
    console.error("[acceso] No se pudo verificar el límite de intentos:", (error as Error).message);
    return { ok: false, motivo: "interno" };
  }

  const resultado = await iniciarSesionConContrasena(email, contrasena, tokenCaptcha);
  switch (resultado.tipo) {
    case "admin":
      return { ok: true };
    case "credenciales-invalidas":
      return { ok: false, motivo: "credenciales" };
    case "sin-acceso":
      return { ok: false, motivo: "sin-acceso" };
    case "no-confirmada":
      return { ok: false, motivo: "no-confirmada" };
    case "captcha":
      return { ok: false, motivo: "verificacion" };
    case "limite":
      return { ok: false, motivo: "limite" };
    case "error":
      // Solo el código de Supabase: nunca el correo ni la contraseña.
      console.error("[acceso] Error de Supabase Auth al iniciar sesión:", resultado.codigo);
      return { ok: false, motivo: "interno" };
  }
}

export type MotivoFalloCambioContrasena =
  | "actual-incorrecta"
  | "misma-contrasena"
  | "debil"
  | "reautenticar"
  | "verificacion"
  | "limite"
  | "interno";

/**
 * Cambio de contraseña del administrador con sesión iniciada. Comparte el límite de
 * intentos del login: comprobar la contraseña actual también sirve para adivinarla.
 */
export async function cambiarContrasenaAdmin(
  actual: string,
  nueva: string,
  tokenCaptcha: string,
  ip: string | null,
): Promise<{ ok: true } | { ok: false; motivo: MotivoFalloCambioContrasena }> {
  await requerirAdmin();

  try {
    if (!(await permitirIntento(ip, "login"))) return { ok: false, motivo: "limite" };
  } catch (error) {
    console.error("[cuenta] No se pudo verificar el límite de intentos:", (error as Error).message);
    return { ok: false, motivo: "interno" };
  }

  const resultado = await cambiarContrasena(actual, nueva, tokenCaptcha);
  switch (resultado.tipo) {
    case "ok":
      return { ok: true };
    // La sesión venció entre la carga de la página y el envío.
    case "sin-sesion":
      redirect("/admin/login?motivo=sesion-requerida");
    case "actual-incorrecta":
    case "misma-contrasena":
    case "debil":
    case "reautenticar":
    case "limite":
      return { ok: false, motivo: resultado.tipo };
    case "captcha":
      return { ok: false, motivo: "verificacion" };
    case "error":
      console.error("[cuenta] Error de Supabase Auth al cambiar la contraseña:", resultado.codigo);
      return { ok: false, motivo: "interno" };
  }
}

export function cerrarSesionActual() {
  return cerrarSesion();
}
