import "server-only";

import { randomBytes } from "node:crypto";

import { ROLES_VER_FICHAS } from "@/config/admin";
import { hoyEnChile } from "@/lib/utils/fechas";
import {
  actualizarMedicamento,
  actualizarPaciente,
  borrarMedicamento,
  buscarPorCodigoQr,
  insertarMedicamento,
  insertarPaciente,
  leerAuditoria,
  leerFicha,
  listarPacientes,
  registrarConsulta,
  type ResultadoEscritura,
} from "@/server/repositories/pacientes";
import type { DatosMedicamento, DatosPaciente } from "@/server/validators/pacientes";

import { requerirRol, type Administrador } from "./auth";

/**
 * Fichas de pacientes (datos de salud, sensibles). Cada función exige el rol que
 * corresponde, y RLS lo vuelve a exigir en la base de datos:
 * - ver: roles "pacientes" o "pacientes_lectura";
 * - editar: rol "pacientes".
 */

type OpcionesAcceso = { volverA?: string };

export function requerirVerFichas(opciones?: OpcionesAcceso) {
  return requerirRol(ROLES_VER_FICHAS, opciones);
}

export function requerirEditarFichas(opciones?: OpcionesAcceso) {
  return requerirRol("pacientes", opciones);
}

export function puedeEditarFichas(admin: Administrador): boolean {
  return admin.roles.includes("pacientes");
}

export async function obtenerListadoPacientes(egresados: boolean) {
  await requerirVerFichas();
  return listarPacientes(egresados);
}

/**
 * Ficha completa. Cada consulta queda en la auditoría. Si el registro fallara, la
 * ficha se muestra igual (la información de medicamentos puede ser urgente) y el
 * error queda en los logs.
 */
export async function obtenerFicha(id: string) {
  const admin = await requerirVerFichas({ volverA: `/admin/pacientes/${id}` });
  const ficha = await leerFicha(id);
  if (ficha) {
    try {
      await registrarConsulta(id);
    } catch (error) {
      console.error("[pacientes] No se pudo registrar la consulta:", (error as Error).message);
    }
  }
  return { ficha, admin, puedeEditar: puedeEditarFichas(admin) };
}

/** Ficha para editar (sin registrar una consulta aparte: la edición ya se audita). */
export async function obtenerFichaParaEditar(id: string) {
  await requerirEditarFichas({ volverA: `/admin/pacientes/${id}` });
  return leerFicha(id);
}

/** Id de la ficha a la que apunta un QR. Sin sesión, pide ingresar y vuelve al QR. */
export async function resolverCodigoQr(codigo: string): Promise<string | null> {
  await requerirVerFichas({ volverA: `/admin/p/${codigo}` });
  return buscarPorCodigoQr(codigo);
}

export async function crearPaciente(datos: DatosPaciente) {
  await requerirEditarFichas();
  return insertarPaciente(datos);
}

export async function editarPaciente(
  id: string,
  datos: DatosPaciente,
): Promise<ResultadoEscritura> {
  await requerirEditarFichas();
  return actualizarPaciente(id, datos);
}

/** Egreso (deja de aparecer entre los residentes activos) o reingreso. No borra la ficha. */
export async function cambiarEgreso(id: string, egresar: boolean): Promise<ResultadoEscritura> {
  await requerirEditarFichas();
  return actualizarPaciente(id, { fecha_egreso: egresar ? hoyEnChile() : null });
}

/**
 * Nuevo código para el QR (128 bits aleatorios): la etiqueta anterior deja de
 * funcionar. Útil si se pierde o se deteriora una etiqueta.
 */
export async function regenerarCodigoQr(id: string): Promise<ResultadoEscritura> {
  await requerirEditarFichas();
  return actualizarPaciente(id, { codigo_qr: randomBytes(16).toString("hex") });
}

export async function guardarMedicamento(
  pacienteId: string,
  medicamentoId: string | null,
  datos: DatosMedicamento,
): Promise<boolean> {
  await requerirEditarFichas();
  return medicamentoId
    ? actualizarMedicamento(medicamentoId, pacienteId, datos)
    : insertarMedicamento({ ...datos, paciente_id: pacienteId });
}

export async function quitarMedicamento(pacienteId: string, medicamentoId: string) {
  await requerirEditarFichas();
  return borrarMedicamento(medicamentoId, pacienteId);
}

export const EVENTOS_HISTORIAL = 100;

export async function obtenerHistorial(pacienteId: string) {
  await requerirEditarFichas({ volverA: `/admin/pacientes/${pacienteId}/historial` });
  const [ficha, eventos] = await Promise.all([
    leerFicha(pacienteId),
    leerAuditoria(pacienteId, EVENTOS_HISTORIAL),
  ]);
  return { ficha, eventos };
}
