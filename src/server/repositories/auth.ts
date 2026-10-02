import "server-only";

import { cookies } from "next/headers";

import { COOKIE_SESION_TEMPORAL, opcionesCookieAuth } from "@/lib/supabase/config";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteSinSesion } from "@/lib/supabase/sin-sesion";
import type { Database } from "@/types/database";

import { ErrorRepositorio } from "./errores";

export type RolAdmin = Database["public"]["Enums"]["rol_admin"];

export type Administrador = {
  id: string;
  email: string;
  nombre: string;
  roles: RolAdmin[];
  /** Ingresó con una contraseña temporal que aún no cambia: solo puede ir a «Mi cuenta». */
  contrasenaTemporal: boolean;
};

/** Sesión actual: sin sesión, con sesión de administrador o con sesión sin ese rol. */
export type SesionActual = { activa: false } | { activa: true; admin: Administrador | null };

/**
 * Lee la sesión desde las cookies y consulta si el usuario es administrador.
 *
 * Usa getUser(), que consulta al servidor de Auth, y no getClaims(), que solo valida
 * la firma del token localmente: así una sesión cerrada desde otro dispositivo (por
 * ejemplo, al cambiar la contraseña o al desactivar la cuenta) o una cuenta eliminada
 * pierde el acceso al panel de inmediato, y no recién cuando vence el token (hasta 1 hora).
 * mi_cuenta() no devuelve nada si la cuenta no está en admins o está desactivada.
 */
export async function obtenerSesionActual(): Promise<SesionActual> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.auth.getUser();
  const usuario = data?.user;
  if (error || !usuario) return { activa: false };

  const { data: cuenta, error: errorCuenta } = await supabase.rpc("mi_cuenta").maybeSingle();
  if (errorCuenta) throw new ErrorRepositorio("mi_cuenta", errorCuenta.code);
  if (!cuenta) return { activa: true, admin: null };

  return {
    activa: true,
    admin: {
      id: usuario.id,
      email: usuario.email ?? "",
      nombre: cuenta.nombre,
      roles: cuenta.roles,
      contrasenaTemporal: cuenta.contrasena_temporal,
    },
  };
}

export type ResultadoInicioSesion =
  | { tipo: "admin" }
  | { tipo: "sin-acceso" }
  | { tipo: "credenciales-invalidas" }
  | { tipo: "no-confirmada" }
  | { tipo: "captcha" }
  | { tipo: "limite" }
  | { tipo: "error"; codigo: string };

/**
 * Inicia sesión con correo y contraseña, y la deja activa SOLO si el usuario es
 * administrador.
 *
 * - captchaToken: si el CAPTCHA está activo en Supabase, lo verifica antes de revisar
 *   la contraseña. Sin token (CAPTCHA desactivado en el sitio) no se envía; Supabase
 *   también debe tenerlo desactivado, o rechazará la solicitud.
 * - La verificación del rol usa la MISMA conexión que acaba de iniciar la sesión: las
 *   cookies nuevas aún no son legibles en esta petición. Si el usuario no es
 *   administrador, esa sesión se cierra de inmediato y nunca queda activa.
 * - recordar: con «Recordar mis datos», la sesión dura 30 días desde el último uso; sin
 *   ella, sus cookies se borran al cerrar el navegador (marca COOKIE_SESION_TEMPORAL).
 */
export async function iniciarSesionConContrasena(
  email: string,
  contrasena: string,
  tokenCaptcha: string,
  recordar: boolean,
): Promise<ResultadoInicioSesion> {
  const almacenCookies = await cookies();
  if (recordar) {
    almacenCookies.delete(COOKIE_SESION_TEMPORAL);
  } else {
    // Sin maxAge ni expires: cookie de sesión, como las de Auth que acompaña.
    const { httpOnly, secure, sameSite, path } = opcionesCookieAuth;
    almacenCookies.set(COOKIE_SESION_TEMPORAL, "1", { httpOnly, secure, sameSite, path });
  }
  const supabase = await crearClienteServidor({ sesionTemporal: !recordar });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: contrasena,
    options: { captchaToken: tokenCaptcha || undefined },
  });

  if (error) {
    switch (error.code) {
      // Supabase responde lo mismo si el correo no existe o si la contraseña es incorrecta.
      case "invalid_credentials":
      // Cuenta desactivada desde el panel. Supabase lo informa aunque la contraseña sea
      // incorrecta: un mensaje propio revelaría qué correos tienen cuenta.
      case "user_banned":
        return { tipo: "credenciales-invalidas" };
      case "email_not_confirmed":
        return { tipo: "no-confirmada" };
      case "captcha_failed":
        return { tipo: "captcha" };
      case "over_request_rate_limit":
        return { tipo: "limite" };
      default:
        return { tipo: "error", codigo: error.code ?? `http_${error.status ?? "desconocido"}` };
    }
  }

  const { data: esAdmin, error: errorRol } = await supabase.rpc("is_admin");
  if (errorRol || esAdmin !== true) {
    await supabase.auth.signOut({ scope: "local" });
    return { tipo: "sin-acceso" };
  }
  return { tipo: "admin" };
}

export type ResultadoCambioContrasena =
  | { tipo: "ok" }
  | { tipo: "sin-sesion" }
  | { tipo: "actual-incorrecta" }
  | { tipo: "misma-contrasena" }
  | { tipo: "debil" }
  | { tipo: "reautenticar" }
  | { tipo: "captcha" }
  | { tipo: "limite" }
  | { tipo: "error"; codigo: string };

const codigoDe = (error: { code?: string; status?: number }) =>
  error.code ?? `http_${error.status ?? "desconocido"}`;

/**
 * Cambia la contraseña del usuario con sesión iniciada.
 *
 * 1. Comprueba la contraseña ACTUAL con un cliente aparte, sin cookies (no toca la
 *    sesión del navegador), y cierra de inmediato esa sesión temporal. Así, alguien que
 *    encuentre un dispositivo con la sesión abierta no puede cambiar la contraseña.
 * 2. Guarda la nueva contraseña.
 * 3. Cierra las sesiones abiertas en OTROS dispositivos.
 */
export async function cambiarContrasena(
  actual: string,
  nueva: string,
  tokenCaptcha: string,
): Promise<ResultadoCambioContrasena> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  if (typeof email !== "string" || !email) return { tipo: "sin-sesion" };

  const verificador = crearClienteSinSesion();
  const { error: errorActual } = await verificador.auth.signInWithPassword({
    email,
    password: actual,
    options: { captchaToken: tokenCaptcha || undefined },
  });
  if (errorActual) {
    switch (errorActual.code) {
      case "invalid_credentials":
        return { tipo: "actual-incorrecta" };
      case "captcha_failed":
        return { tipo: "captcha" };
      case "over_request_rate_limit":
        return { tipo: "limite" };
      default:
        return { tipo: "error", codigo: codigoDe(errorActual) };
    }
  }
  // scope "local": revoca solo la sesión temporal de la verificación, no la del navegador.
  await verificador.auth.signOut({ scope: "local" });

  const { error: errorNueva } = await supabase.auth.updateUser({ password: nueva });
  if (errorNueva) {
    switch (errorNueva.code) {
      case "same_password":
        return { tipo: "misma-contrasena" };
      case "weak_password":
        return { tipo: "debil" };
      case "reauthentication_needed":
        return { tipo: "reautenticar" };
      default:
        return { tipo: "error", codigo: codigoDe(errorNueva) };
    }
  }

  await supabase.auth.signOut({ scope: "others" });
  return { tipo: "ok" };
}

export type ResultadoSolicitudRecuperacion =
  { tipo: "ok" } | { tipo: "captcha" } | { tipo: "limite" } | { tipo: "error"; codigo: string };

/**
 * Pide a Supabase Auth el correo para restablecer la contraseña (plantilla "Reset
 * Password", que enlaza a /admin/restablecer con el token_hash).
 *
 * Usa un cliente sin cookies: no toca la sesión del navegador y el enlace funciona desde
 * cualquier dispositivo (no depende de un verificador PKCE guardado en este navegador).
 * Si el correo no tiene cuenta, Supabase responde lo mismo y no envía nada.
 */
export async function solicitarCorreoRecuperacion(
  email: string,
  tokenCaptcha: string,
): Promise<ResultadoSolicitudRecuperacion> {
  const supabase = crearClienteSinSesion();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    captchaToken: tokenCaptcha || undefined,
  });
  if (!error) return { tipo: "ok" };

  switch (error.code) {
    case "captcha_failed":
      return { tipo: "captcha" };
    // Cupo de correos del proyecto o espera mínima entre correos a una misma cuenta.
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return { tipo: "limite" };
    default:
      return { tipo: "error", codigo: codigoDe(error) };
  }
}

export type ResultadoRestablecimiento =
  | { tipo: "ok"; sesionesCerradas: boolean }
  | { tipo: "enlace-invalido" }
  | { tipo: "misma-contrasena" }
  | { tipo: "debil" }
  | { tipo: "limite" }
  | { tipo: "error"; codigo: string };

/**
 * Restablece la contraseña con el enlace del correo, en un solo paso y sin dejar una
 * sesión abierta:
 * 1. Canjea el token_hash (sirve una sola vez) en un cliente aparte, sin cookies.
 * 2. Guarda la nueva contraseña con esa sesión temporal.
 * 3. Cierra TODAS las sesiones de la cuenta (scope "global"), incluida la temporal: si
 *    alguien más tenía acceso, lo pierde. Luego la persona ingresa con la nueva contraseña.
 */
export async function restablecerConEnlace(
  tokenHash: string,
  nueva: string,
): Promise<ResultadoRestablecimiento> {
  const temporal = crearClienteSinSesion();

  const { error: errorEnlace } = await temporal.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });
  if (errorEnlace) {
    switch (errorEnlace.code) {
      // Vencido, ya usado o inexistente: Supabase no distingue entre ellos.
      case "otp_expired":
        return { tipo: "enlace-invalido" };
      case "over_request_rate_limit":
        return { tipo: "limite" };
      default:
        return { tipo: "error", codigo: codigoDe(errorEnlace) };
    }
  }

  const { error: errorNueva } = await temporal.auth.updateUser({ password: nueva });
  if (errorNueva) {
    // La contraseña no cambió: basta con cerrar la sesión temporal.
    await temporal.auth.signOut({ scope: "local" });
    switch (errorNueva.code) {
      case "same_password":
        return { tipo: "misma-contrasena" };
      case "weak_password":
        return { tipo: "debil" };
      default:
        return { tipo: "error", codigo: codigoDe(errorNueva) };
    }
  }

  const { error: errorCierre } = await temporal.auth.signOut({ scope: "global" });
  return { tipo: "ok", sesionesCerradas: !errorCierre };
}

/** Cierra la sesión solo en este dispositivo (scope "local"). */
export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(COOKIE_SESION_TEMPORAL);
}
