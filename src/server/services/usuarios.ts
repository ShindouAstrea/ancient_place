import "server-only";

import { randomInt } from "node:crypto";

import {
  actualizarCuenta,
  actualizarEstadoCuenta,
  guardarContrasenaTemporal,
  insertarCuenta,
  leerHistorialCuenta,
  listarCuentas,
} from "@/server/repositories/usuarios";
import type { DatosEdicionCuenta, DatosNuevaCuenta } from "@/server/validators/usuarios";

import { requerirRol } from "./auth";

export type { Cuenta, EventoCuenta } from "@/server/repositories/usuarios";

/**
 * Cuentas del panel (/admin/usuarios). Cada función exige el rol "usuarios", y la base de
 * datos lo vuelve a exigir.
 */

type OpcionesAcceso = { volverA?: string };

export function requerirGestionUsuarios(opciones?: OpcionesAcceso) {
  return requerirRol("usuarios", opciones);
}

/**
 * Contraseña temporal: 16 caracteres al azar (unos 79 bits) en grupos de 4, sin
 * caracteres que se confundan al leerlos o dictarlos (0/o, 1/l/i). Se genera con el
 * generador criptográfico del sistema y nunca se guarda en texto plano.
 */
const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789";

export function generarContrasenaTemporal(): string {
  const grupo = () =>
    Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return [grupo(), grupo(), grupo(), grupo()].join("-");
}

export async function obtenerCuentas() {
  const admin = await requerirGestionUsuarios({ volverA: "/admin/usuarios" });
  return { admin, cuentas: await listarCuentas() };
}

export const EVENTOS_HISTORIAL_CUENTA = 30;

/** Una cuenta con su historial. Son pocas cuentas: se busca en el listado. */
export async function obtenerCuenta(id: string) {
  const admin = await requerirGestionUsuarios({ volverA: `/admin/usuarios/${id}` });
  const cuenta = (await listarCuentas()).find((c) => c.id === id) ?? null;
  const historial = cuenta ? await leerHistorialCuenta(id, EVENTOS_HISTORIAL_CUENTA) : [];
  return { admin, cuenta, historial };
}

/** Crea la cuenta y devuelve su contraseña temporal (para mostrarla una sola vez). */
export async function crearCuenta(datos: DatosNuevaCuenta) {
  await requerirGestionUsuarios();
  const contrasena = generarContrasenaTemporal();
  const resultado = await insertarCuenta(datos, contrasena);
  return resultado.tipo === "ok" ? { ...resultado, contrasena } : resultado;
}

export async function editarCuenta(id: string, datos: DatosEdicionCuenta) {
  await requerirGestionUsuarios();
  return actualizarCuenta(id, datos);
}

/** Desactivar cierra sus sesiones y bloquea el ingreso; reactivar le devuelve el acceso. */
export async function cambiarEstadoCuenta(id: string, activa: boolean) {
  await requerirGestionUsuarios();
  return actualizarEstadoCuenta(id, activa);
}

/** Nueva contraseña temporal: cierra sus sesiones; al ingresar deberá elegir una propia. */
export async function darContrasenaTemporal(id: string) {
  await requerirGestionUsuarios();
  const contrasena = generarContrasenaTemporal();
  const resultado = await guardarContrasenaTemporal(id, contrasena);
  return resultado.tipo === "ok" ? { ...resultado, contrasena } : resultado;
}
