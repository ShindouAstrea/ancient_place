"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import type { ResultadoRegistro } from "@/server/repositories/dosis";
import {
  anularDosis,
  registrarDosisProgramada,
  registrarDosisSituacional,
} from "@/server/services/dosis";
import { erroresPorCampo } from "@/server/validators/contacto";
import type { EstadoEdicion } from "@/server/validators/contenido";
import {
  MENSAJES_REGLA_DOSIS,
  esquemaAnulacion,
  esquemaDosisProgramada,
  esquemaDosisSituacional,
} from "@/server/validators/dosis";

/**
 * Registro de dosis desde la ficha y la ronda. Como toda Server Action, son endpoints
 * públicos: validan la entrada y el servicio exige permiso para ver fichas.
 */

const ERROR_INTERNO = "No pudimos guardar el registro. Inténtalo en unos minutos.";
const REVISAR = "Revisa los datos marcados.";

function aEstado(resultado: ResultadoRegistro, exito: string): EstadoEdicion {
  switch (resultado.tipo) {
    case "ok":
      refresh();
      return { estado: "exito", mensaje: exito };
    case "ya-registrada":
      // Otra persona se adelantó. Sin refresh(): el aviso debe quedar a la vista (el
      // botón «Actualizar» del formulario muestra quién la registró).
      return { estado: "error", mensaje: "Otra persona ya registró esta dosis." };
    case "regla":
      return { estado: "error", mensaje: MENSAJES_REGLA_DOSIS[resultado.codigo] ?? ERROR_INTERNO };
    case "sin-permiso":
      return { estado: "error", mensaje: "No tienes permiso para registrar dosis." };
  }
}

function fallo(operacion: string, error: unknown): EstadoEdicion {
  unstable_rethrow(error); // deja pasar la redirección al login si la sesión venció
  console.error(`[dosis] Error al ${operacion}:`, (error as Error).message);
  return { estado: "error", mensaje: ERROR_INTERNO };
}

/** Dosis programada: dada, o no dada con su motivo. */
export async function registrarDosisAccion(entrada: unknown): Promise<EstadoEdicion> {
  const validacion = esquemaDosisProgramada.safeParse(entrada);
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }
  try {
    const resultado = await registrarDosisProgramada(validacion.data);
    return aEstado(
      resultado,
      validacion.data.resultado === "administrada" ? "Dosis registrada." : "Registrado: no se dio.",
    );
  } catch (error) {
    return fallo("registrar la dosis", error);
  }
}

/** Dosis de un medicamento situacional, con la situación que la motivó. */
export async function registrarSituacionalAccion(entrada: unknown): Promise<EstadoEdicion> {
  const validacion = esquemaDosisSituacional.safeParse(entrada);
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }
  try {
    const { medicamentoId, observacion } = validacion.data;
    return aEstado(
      await registrarDosisSituacional(medicamentoId, observacion),
      "Dosis registrada.",
    );
  } catch (error) {
    return fallo("registrar el situacional", error);
  }
}

/** Anula un registro (nunca lo borra). */
export async function anularDosisAccion(entrada: unknown): Promise<EstadoEdicion> {
  const validacion = esquemaAnulacion.safeParse(entrada);
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }
  try {
    const ok = await anularDosis(validacion.data.id, validacion.data.motivo);
    if (!ok) {
      return {
        estado: "error",
        mensaje: "Solo quien hizo el registro, o quien edita fichas, puede anularlo.",
      };
    }
    refresh();
    return { estado: "exito", mensaje: "Registro anulado." };
  } catch (error) {
    return fallo("anular el registro", error);
  }
}
