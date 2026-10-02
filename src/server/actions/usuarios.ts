"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import type { ResultadoCuenta } from "@/server/repositories/usuarios";
import {
  cambiarEstadoCuenta,
  crearCuenta,
  darContrasenaTemporal,
  editarCuenta,
} from "@/server/services/usuarios";
import { erroresPorCampo } from "@/server/validators/contacto";
import { esquemaId } from "@/server/validators/contenido";
import {
  MENSAJES_REGLA_CUENTA,
  cuentaDesdeFormulario,
  esquemaEdicionCuenta,
  esquemaNuevaCuenta,
  type EstadoCuenta,
} from "@/server/validators/usuarios";

/**
 * Acciones de /admin/usuarios. Como toda Server Action, son endpoints públicos: validan
 * la entrada y el servicio exige el rol "usuarios" (la base de datos lo vuelve a exigir).
 * Las contraseñas temporales solo viajan en la respuesta: nunca se registran en logs.
 */

const SIN_PERMISO = "No tienes permiso para administrar usuarios.";
const ERROR_INTERNO = "No pudimos guardar los cambios. Inténtalo en unos minutos.";
const REVISAR = "Revisa los campos marcados.";

/** Error sin datos de la cuenta ni contraseñas. */
function fallo(operacion: string, error: unknown): EstadoCuenta {
  unstable_rethrow(error); // deja pasar la redirección al login si la sesión venció
  console.error(`[usuarios] Error al ${operacion}:`, (error as Error).message);
  return { estado: "error", mensaje: ERROR_INTERNO };
}

/** Mensaje para un rechazo de la base de datos. `propia`: qué decir si era la propia cuenta. */
function rechazo(
  resultado: Exclude<ResultadoCuenta, { tipo: "ok" }>,
  propia: string,
): EstadoCuenta {
  if (resultado.tipo === "sin-permiso") return { estado: "error", mensaje: SIN_PERMISO };
  if (resultado.codigo === "propia_cuenta") return { estado: "error", mensaje: propia };
  const mensaje = MENSAJES_REGLA_CUENTA[resultado.codigo] ?? ERROR_INTERNO;
  if (resultado.codigo === "correo_existente" || resultado.codigo === "correo_invalido") {
    return { estado: "error", mensaje, errores: { email: mensaje } };
  }
  return { estado: "error", mensaje };
}

/** Crea una cuenta. No redirige: la contraseña temporal se muestra en la misma pantalla. */
export async function crearCuentaAccion(
  _estadoAnterior: EstadoCuenta,
  formData: FormData,
): Promise<EstadoCuenta> {
  const validacion = esquemaNuevaCuenta.safeParse(cuentaDesdeFormulario(formData));
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }
  try {
    const resultado = await crearCuenta(validacion.data);
    if (resultado.tipo !== "ok") return rechazo(resultado, ERROR_INTERNO);
    return {
      estado: "exito",
      mensaje: "Cuenta creada.",
      contrasena: resultado.contrasena,
      creada: { id: resultado.id, email: validacion.data.email, nombre: validacion.data.nombre },
    };
  } catch (error) {
    return fallo("crear la cuenta", error);
  }
}

/** Nombre y permisos de una cuenta. */
export async function guardarCuentaAccion(
  id: string,
  _estadoAnterior: EstadoCuenta,
  formData: FormData,
): Promise<EstadoCuenta> {
  if (!esquemaId.safeParse(id).success) return { estado: "error", mensaje: ERROR_INTERNO };
  const validacion = esquemaEdicionCuenta.safeParse(cuentaDesdeFormulario(formData));
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }
  try {
    const resultado = await editarCuenta(id, validacion.data);
    if (resultado.tipo !== "ok") {
      return rechazo(
        resultado,
        "No puedes quitarte el permiso «Usuarios y permisos»: pídeselo a otra persona que lo tenga.",
      );
    }
    refresh();
    return { estado: "exito", mensaje: "Cambios guardados." };
  } catch (error) {
    return fallo("guardar la cuenta", error);
  }
}

/** Desactiva (activa = false) o reactiva una cuenta. */
export async function cambiarEstadoCuentaAccion(
  id: string,
  activa: boolean,
): Promise<EstadoCuenta> {
  if (!esquemaId.safeParse(id).success) return { estado: "error", mensaje: ERROR_INTERNO };
  try {
    const resultado = await cambiarEstadoCuenta(id, activa === true);
    if (resultado.tipo !== "ok") {
      return rechazo(resultado, "No puedes desactivar tu propia cuenta.");
    }
    refresh();
    return {
      estado: "exito",
      mensaje: activa
        ? "Cuenta reactivada: puede volver a ingresar con sus permisos de antes."
        : "Cuenta desactivada: ya no puede ingresar y se cerró su sesión en todos sus dispositivos.",
    };
  } catch (error) {
    return fallo("cambiar el estado de la cuenta", error);
  }
}

/** Nueva contraseña temporal para otra persona (ej: olvidó la suya). */
export async function contrasenaTemporalAccion(id: string): Promise<EstadoCuenta> {
  if (!esquemaId.safeParse(id).success) return { estado: "error", mensaje: ERROR_INTERNO };
  try {
    const resultado = await darContrasenaTemporal(id);
    if (resultado.tipo !== "ok") {
      return rechazo(resultado, "Tu propia contraseña se cambia en «Mi cuenta», con la actual.");
    }
    // refresh() actualiza el estado y el historial de la página; el componente que muestra
    // la contraseña no se desmonta, así que sigue a la vista.
    refresh();
    return {
      estado: "exito",
      mensaje: "Nueva contraseña temporal lista.",
      contrasena: resultado.contrasena,
    };
  } catch (error) {
    return fallo("dar una contraseña temporal", error);
  }
}
