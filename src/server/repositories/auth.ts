import "server-only";

import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteVerificacion } from "@/lib/supabase/verificacion";

import { ErrorRepositorio } from "./errores";

export type Administrador = { id: string; email: string };

/** Sesión actual: sin sesión, con sesión de administrador o con sesión sin ese rol. */
export type SesionActual = { activa: false } | { activa: true; admin: Administrador | null };

/**
 * Lee la sesión desde las cookies y consulta si el usuario es administrador.
 *
 * Usa getUser(), que consulta al servidor de Auth, y no getClaims(), que solo valida
 * la firma del token localmente: así una sesión cerrada desde otro dispositivo (por
 * ejemplo, al cambiar la contraseña) o una cuenta eliminada pierde el acceso al
 * panel de inmediato, y no recién cuando vence el token (hasta 1 hora).
 * is_admin() consulta la tabla admins.
 */
export async function obtenerSesionActual(): Promise<SesionActual> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.auth.getUser();
  const usuario = data?.user;
  if (error || !usuario) return { activa: false };

  const { data: esAdmin, error: errorRol } = await supabase.rpc("is_admin");
  if (errorRol) throw new ErrorRepositorio("is_admin", errorRol.code);

  return {
    activa: true,
    admin: esAdmin ? { id: usuario.id, email: usuario.email ?? "" } : null,
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
 */
export async function iniciarSesionConContrasena(
  email: string,
  contrasena: string,
  tokenCaptcha: string,
): Promise<ResultadoInicioSesion> {
  const supabase = await crearClienteServidor();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: contrasena,
    options: { captchaToken: tokenCaptcha || undefined },
  });

  if (error) {
    switch (error.code) {
      // Supabase responde lo mismo si el correo no existe o si la contraseña es incorrecta.
      case "invalid_credentials":
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

  const verificador = crearClienteVerificacion();
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

/** Cierra la sesión solo en este dispositivo (scope "local"). */
export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
}
