import "server-only";

import { crearClienteServidor } from "@/lib/supabase/server";

import { ErrorRepositorio } from "./errores";

export type Administrador = { id: string; email: string };

/** Sesión actual: sin sesión, con sesión de administrador o con sesión sin ese rol. */
export type SesionActual = { activa: false } | { activa: true; admin: Administrador | null };

/**
 * Lee la sesión desde las cookies y consulta si el usuario es administrador.
 * getClaims() valida la firma del token; is_admin() consulta la tabla admins.
 */
export async function obtenerSesionActual(): Promise<SesionActual> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { activa: false };

  const { data: esAdmin, error: errorRol } = await supabase.rpc("is_admin");
  if (errorRol) throw new ErrorRepositorio("is_admin", errorRol.code);

  return {
    activa: true,
    admin: esAdmin
      ? { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" }
      : null,
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

/** Cierra la sesión solo en este dispositivo (scope "local"). */
export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
}
