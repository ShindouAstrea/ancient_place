"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { obtenerIpCliente } from "@/lib/utils/ip";
import {
  cambiarContrasenaAdmin,
  cerrarSesionActual,
  iniciarSesion,
  type MotivoFalloCambioContrasena,
  type MotivoFalloInicioSesion,
} from "@/server/services/auth";
import {
  LARGO_MINIMO_CONTRASENA,
  esquemaCambioContrasena,
  esquemaInicioSesion,
  type CampoCambioContrasena,
  type CampoInicioSesion,
  type EstadoCambioContrasena,
  type EstadoInicioSesion,
} from "@/server/validators/auth";
import { CAMPO_TURNSTILE, erroresPorCampo } from "@/server/validators/contacto";

const MENSAJES_ERROR: Record<MotivoFalloInicioSesion, string> = {
  credenciales: "Correo o contraseña incorrectos.",
  "sin-acceso": "Esta cuenta no tiene acceso al panel de administración.",
  "no-confirmada":
    "Tu cuenta aún no está confirmada. Pide que la confirmen en Supabase (Authentication → Users).",
  verificacion:
    "No pudimos confirmar la verificación de seguridad. Por favor, inténtalo nuevamente.",
  limite: "Hiciste muchos intentos en poco tiempo. Espera un rato y vuelve a intentarlo.",
  interno: "Tuvimos un problema al iniciar sesión. Inténtalo en unos minutos.",
};

/** Inicio de sesión (formulario de /admin/login). Si todo está bien, redirige al panel. */
export async function iniciarSesionAccion(
  _estadoAnterior: EstadoInicioSesion,
  formData: FormData,
): Promise<EstadoInicioSesion> {
  const email = formData.get("email");
  const password = formData.get("password");
  const validacion = esquemaInicioSesion.safeParse({
    email: typeof email === "string" ? email : "",
    password: typeof password === "string" ? password : "",
  });
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: "Revisa los datos ingresados.",
      errores: erroresPorCampo<CampoInicioSesion>(validacion.error),
    };
  }

  const token = formData.get(CAMPO_TURNSTILE);
  const resultado = await iniciarSesion(
    validacion.data.email,
    validacion.data.password,
    typeof token === "string" ? token : "",
    obtenerIpCliente(await headers()),
  );

  // redirect() fuera de cualquier try/catch: Next.js lo implementa lanzando una excepción.
  if (resultado.ok) redirect("/admin");

  return {
    estado: "error",
    mensaje: MENSAJES_ERROR[resultado.motivo],
    limpiarContrasena: resultado.motivo === "credenciales",
  };
}

const MENSAJES_CAMBIO: Record<MotivoFalloCambioContrasena, string> = {
  "actual-incorrecta": "La contraseña actual no es correcta.",
  "misma-contrasena": "La nueva contraseña debe ser distinta de la actual.",
  debil: `La nueva contraseña es demasiado débil. Usa al menos ${LARGO_MINIMO_CONTRASENA} caracteres; una frase fácil de recordar funciona bien.`,
  reautenticar: "Por seguridad, cierra sesión, vuelve a ingresar e inténtalo de nuevo.",
  verificacion:
    "No pudimos confirmar la verificación de seguridad. Por favor, inténtalo nuevamente.",
  limite: "Hiciste muchos intentos en poco tiempo. Espera un rato y vuelve a intentarlo.",
  interno: "Tuvimos un problema al cambiar la contraseña. Inténtalo en unos minutos.",
};

/** Cambio de contraseña (formulario de /admin/cuenta). */
export async function cambiarContrasenaAccion(
  _estadoAnterior: EstadoCambioContrasena,
  formData: FormData,
): Promise<EstadoCambioContrasena> {
  const texto = (campo: string) => {
    const valor = formData.get(campo);
    return typeof valor === "string" ? valor : "";
  };
  const validacion = esquemaCambioContrasena.safeParse({
    actual: texto("actual"),
    nueva: texto("nueva"),
    repetir: texto("repetir"),
  });
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: "Revisa los datos ingresados.",
      errores: erroresPorCampo<CampoCambioContrasena>(validacion.error),
    };
  }

  const resultado = await cambiarContrasenaAdmin(
    validacion.data.actual,
    validacion.data.nueva,
    texto(CAMPO_TURNSTILE),
    obtenerIpCliente(await headers()),
  );
  if (resultado.ok) return { estado: "exito" };

  // Errores que corresponden a un campo concreto se muestran junto a él.
  if (resultado.motivo === "actual-incorrecta") {
    return {
      estado: "error",
      mensaje: MENSAJES_CAMBIO[resultado.motivo],
      errores: { actual: MENSAJES_CAMBIO[resultado.motivo] },
    };
  }
  if (resultado.motivo === "misma-contrasena" || resultado.motivo === "debil") {
    return {
      estado: "error",
      mensaje: MENSAJES_CAMBIO[resultado.motivo],
      errores: { nueva: MENSAJES_CAMBIO[resultado.motivo] },
    };
  }
  return { estado: "error", mensaje: MENSAJES_CAMBIO[resultado.motivo] };
}

/** Cerrar sesión (siempre por POST: un enlace GET podría activarse sin querer). */
export async function salir(): Promise<void> {
  await cerrarSesionActual();
  redirect("/admin/login?motivo=sesion-cerrada");
}
