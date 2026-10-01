"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import {
  cambiarEgreso,
  crearPaciente,
  editarPaciente,
  guardarMedicamento,
  quitarMedicamento,
  regenerarCodigoQr,
} from "@/server/services/pacientes";
import { erroresPorCampo } from "@/server/validators/contacto";
import { esquemaId, type EstadoEdicion } from "@/server/validators/contenido";
import {
  esquemaMedicamento,
  esquemaPaciente,
  medicamentoDesdeFormulario,
} from "@/server/validators/pacientes";

/**
 * Acciones de las fichas de pacientes. Como toda Server Action, son endpoints públicos:
 * validan la entrada y el servicio exige el rol "pacientes" (RLS lo vuelve a exigir).
 * Los mensajes nunca incluyen datos de la ficha ni detalles internos.
 */

const SIN_PERMISO = "No tienes permiso para modificar fichas.";
const ERROR_INTERNO = "No pudimos guardar los cambios. Inténtalo en unos minutos.";
const REVISAR = "Revisa los campos marcados.";
const RUT_REPETIDO = "Ya existe una ficha con ese RUT.";

/** Campos de texto del formulario (ignora campos internos de Next.js). */
function textos(formData: FormData): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of formData.entries()) {
    if (typeof valor === "string" && !clave.startsWith("$ACTION")) salida[clave] = valor;
  }
  return salida;
}

/** Registra el error (sin datos del paciente) y devuelve un mensaje amable. */
function fallo(operacion: string, error: unknown): EstadoEdicion {
  unstable_rethrow(error); // deja pasar la redirección al login si la sesión venció
  console.error(`[pacientes] Error al ${operacion}:`, (error as Error).message);
  return { estado: "error", mensaje: ERROR_INTERNO };
}

/** Crea (id null) o edita una ficha. Si todo está bien, vuelve a la ficha. */
export async function guardarPacienteAccion(
  id: string | null,
  _estadoAnterior: EstadoEdicion,
  formData: FormData,
): Promise<EstadoEdicion> {
  if (id !== null && !esquemaId.safeParse(id).success) {
    return { estado: "error", mensaje: ERROR_INTERNO };
  }
  const validacion = esquemaPaciente.safeParse(textos(formData));
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }

  let destino: string;
  try {
    if (id === null) {
      const resultado = await crearPaciente(validacion.data);
      if (resultado.tipo === "rut-repetido") {
        return { estado: "error", mensaje: RUT_REPETIDO, errores: { rut: RUT_REPETIDO } };
      }
      destino = `/admin/pacientes/${resultado.id}?aviso=creada`;
    } else {
      const resultado = await editarPaciente(id, validacion.data);
      if (resultado.tipo === "rut-repetido") {
        return { estado: "error", mensaje: RUT_REPETIDO, errores: { rut: RUT_REPETIDO } };
      }
      if (resultado.tipo === "sin-permiso") return { estado: "error", mensaje: SIN_PERMISO };
      destino = `/admin/pacientes/${id}?aviso=guardada`;
    }
  } catch (error) {
    return fallo("guardar la ficha", error);
  }
  // redirect() fuera del try/catch: Next.js lo implementa lanzando una excepción.
  redirect(destino);
}

/** Egresa (egresar = true) o reingresa una ficha. */
export async function cambiarEgresoAccion(id: string, egresar: boolean): Promise<EstadoEdicion> {
  if (!esquemaId.safeParse(id).success) return { estado: "error", mensaje: ERROR_INTERNO };
  try {
    const resultado = await cambiarEgreso(id, egresar === true);
    if (resultado.tipo !== "ok") return { estado: "error", mensaje: SIN_PERMISO };
    refresh();
    return {
      estado: "exito",
      mensaje: egresar
        ? "La ficha quedó como egresada."
        : "La ficha volvió a los residentes activos.",
    };
  } catch (error) {
    return fallo("cambiar el egreso", error);
  }
}

/** Nuevo código QR: la etiqueta anterior deja de funcionar. */
export async function regenerarQrAccion(id: string): Promise<EstadoEdicion> {
  if (!esquemaId.safeParse(id).success) return { estado: "error", mensaje: ERROR_INTERNO };
  try {
    const resultado = await regenerarCodigoQr(id);
    if (resultado.tipo !== "ok") return { estado: "error", mensaje: SIN_PERMISO };
    refresh();
    return {
      estado: "exito",
      mensaje:
        "Listo: se generó un QR nuevo. Imprímelo y reemplaza la etiqueta anterior, que ya no funciona.",
    };
  } catch (error) {
    return fallo("regenerar el QR", error);
  }
}

/** Crea (medicamentoId null) o edita un medicamento de la ficha. */
export async function guardarMedicamentoAccion(
  pacienteId: string,
  medicamentoId: string | null,
  _estadoAnterior: EstadoEdicion,
  formData: FormData,
): Promise<EstadoEdicion> {
  if (
    !esquemaId.safeParse(pacienteId).success ||
    (medicamentoId !== null && !esquemaId.safeParse(medicamentoId).success)
  ) {
    return { estado: "error", mensaje: ERROR_INTERNO };
  }
  const validacion = esquemaMedicamento.safeParse(medicamentoDesdeFormulario(formData));
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }
  try {
    const ok = await guardarMedicamento(pacienteId, medicamentoId, validacion.data);
    if (!ok) return { estado: "error", mensaje: SIN_PERMISO };
    refresh();
    return { estado: "exito", mensaje: "Medicamento guardado." };
  } catch (error) {
    return fallo("guardar el medicamento", error);
  }
}

export async function quitarMedicamentoAccion(
  pacienteId: string,
  medicamentoId: string,
): Promise<EstadoEdicion> {
  if (!esquemaId.safeParse(pacienteId).success || !esquemaId.safeParse(medicamentoId).success) {
    return { estado: "error", mensaje: ERROR_INTERNO };
  }
  try {
    const ok = await quitarMedicamento(pacienteId, medicamentoId);
    if (!ok) return { estado: "error", mensaje: SIN_PERMISO };
    refresh();
    return { estado: "exito", mensaje: "Medicamento quitado." };
  } catch (error) {
    return fallo("quitar el medicamento", error);
  }
}
