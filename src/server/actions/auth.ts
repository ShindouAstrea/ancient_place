"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { obtenerIpCliente } from "@/lib/utils/ip";
import {
  cambiarContrasenaAdmin,
  cerrarSesionActual,
  iniciarSesion,
  restablecerContrasena,
  solicitarRecuperacion,
  type MotivoFalloCambioContrasena,
  type MotivoFalloInicioSesion,
  type MotivoFalloRecuperacion,
  type MotivoFalloRestablecimiento,
} from "@/server/services/auth";
import {
  LARGO_MINIMO_CONTRASENA,
  esquemaCambioContrasena,
  esquemaInicioSesion,
  esquemaRestablecimiento,
  esquemaSolicitudRecuperacion,
  esquemaTokenRecuperacion,
  rutaSiguienteSegura,
  type CampoCambioContrasena,
  type CampoInicioSesion,
  type CampoRestablecimiento,
  type CampoSolicitudRecuperacion,
  type EstadoCambioContrasena,
  type EstadoInicioSesion,
  type EstadoRestablecimiento,
  type EstadoSolicitudRecuperacion,
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
    formData.get("recordar") === "on",
    obtenerIpCliente(await headers()),
  );

  // redirect() fuera de cualquier try/catch: Next.js lo implementa lanzando una excepción.
  // La ruta de regreso se vuelve a validar aquí: el formulario la envía el navegador.
  if (resultado.ok) redirect(rutaSiguienteSegura(formData.get("siguiente")) ?? "/admin");

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

const MENSAJES_RECUPERACION: Record<MotivoFalloRecuperacion, string> = {
  verificacion:
    "No pudimos confirmar la verificación de seguridad. Por favor, inténtalo nuevamente.",
  limite:
    "Se pidieron muchos correos en poco tiempo. Espera un rato y vuelve a intentarlo; si ya pediste uno, revisa tu bandeja de entrada y la carpeta de spam.",
  interno: "Tuvimos un problema al enviar el correo. Inténtalo en unos minutos.",
};

/** "¿Olvidaste tu contraseña?" (formulario de /admin/recuperar). */
export async function solicitarRecuperacionAccion(
  _estadoAnterior: EstadoSolicitudRecuperacion,
  formData: FormData,
): Promise<EstadoSolicitudRecuperacion> {
  const email = formData.get("email");
  const validacion = esquemaSolicitudRecuperacion.safeParse({
    email: typeof email === "string" ? email : "",
  });
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: "Revisa el correo ingresado.",
      errores: erroresPorCampo<CampoSolicitudRecuperacion>(validacion.error),
    };
  }

  const token = formData.get(CAMPO_TURNSTILE);
  const resultado = await solicitarRecuperacion(
    validacion.data.email,
    typeof token === "string" ? token : "",
    obtenerIpCliente(await headers()),
  );
  if (resultado.ok) return { estado: "exito", email: validacion.data.email };
  return { estado: "error", mensaje: MENSAJES_RECUPERACION[resultado.motivo] };
}

const MENSAJES_RESTABLECIMIENTO: Record<MotivoFalloRestablecimiento, string> = {
  "enlace-invalido":
    "Ya se usó o venció: cada enlace dura 1 hora y sirve una sola vez. Pide uno nuevo.",
  "misma-contrasena":
    "Esa ya era tu contraseña, así que no hubo cambios: puedes ingresar con ella.",
  debil:
    "Esa contraseña es demasiado débil o apareció en filtraciones conocidas. Pide un nuevo enlace y elige otra; una frase fácil de recordar funciona bien.",
  limite: "Hiciste muchos intentos en poco tiempo. Espera un rato y vuelve a intentarlo.",
  interno: "Tuvimos un problema al guardar la contraseña. Inténtalo en unos minutos.",
};

/** Nueva contraseña con el enlace del correo (formulario de /admin/restablecer). */
export async function restablecerContrasenaAccion(
  _estadoAnterior: EstadoRestablecimiento,
  formData: FormData,
): Promise<EstadoRestablecimiento> {
  const texto = (campo: string) => {
    const valor = formData.get(campo);
    return typeof valor === "string" ? valor : "";
  };

  const token = esquemaTokenRecuperacion.safeParse(texto("token_hash"));
  if (!token.success) {
    return {
      estado: "error",
      mensaje: MENSAJES_RESTABLECIMIENTO["enlace-invalido"],
      siguiente: "nuevo-enlace",
    };
  }
  const validacion = esquemaRestablecimiento.safeParse({
    nueva: texto("nueva"),
    repetir: texto("repetir"),
  });
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: "Revisa los datos ingresados.",
      errores: erroresPorCampo<CampoRestablecimiento>(validacion.error),
    };
  }

  const resultado = await restablecerContrasena(
    token.data,
    validacion.data.nueva,
    obtenerIpCliente(await headers()),
  );
  // redirect() fuera de cualquier try/catch: Next.js lo implementa lanzando una excepción.
  if (resultado.ok) redirect("/admin/login?motivo=contrasena-restablecida");

  const mensaje = MENSAJES_RESTABLECIMIENTO[resultado.motivo];
  switch (resultado.motivo) {
    // Tras estos errores el enlace ya se usó: el formulario deja de servir.
    case "enlace-invalido":
    case "debil":
      return { estado: "error", mensaje, siguiente: "nuevo-enlace" };
    case "misma-contrasena":
      return { estado: "error", mensaje, siguiente: "ingresar" };
    // El enlace sigue sirviendo: se puede reintentar.
    case "limite":
    case "interno":
      return { estado: "error", mensaje };
  }
}

/** Cerrar sesión (siempre por POST: un enlace GET podría activarse sin querer). */
export async function salir(): Promise<void> {
  await cerrarSesionActual();
  redirect("/admin/login?motivo=sesion-cerrada");
}
