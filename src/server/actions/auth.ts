"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { obtenerIpCliente } from "@/lib/utils/ip";
import {
  cerrarSesionActual,
  iniciarSesion,
  type MotivoFalloInicioSesion,
} from "@/server/services/auth";
import {
  esquemaInicioSesion,
  type CampoInicioSesion,
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

/** Cerrar sesión (siempre por POST: un enlace GET podría activarse sin querer). */
export async function salir(): Promise<void> {
  await cerrarSesionActual();
  redirect("/admin/login?motivo=sesion-cerrada");
}
