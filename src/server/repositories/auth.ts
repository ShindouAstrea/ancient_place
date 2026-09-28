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

/**
 * Pide a Supabase Auth que envíe un enlace mágico.
 * - shouldCreateUser: false → nunca crea usuarios (además el registro está deshabilitado).
 * - captchaToken → si el CAPTCHA está activo en Supabase, lo verifica antes de hacer nada.
 *   Sin token (CAPTCHA desactivado en el sitio) no se envía: Supabase también debe
 *   tenerlo desactivado, o rechazará la solicitud.
 * Devuelve el código de error de Supabase (sin datos personales) o null si se aceptó.
 */
export async function enviarEnlaceMagico(email: string, tokenCaptcha: string) {
  const supabase = await crearClienteServidor();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, captchaToken: tokenCaptcha || undefined },
  });

  return error ? { codigo: error.code ?? `http_${error.status ?? "desconocido"}` } : null;
}

/**
 * Canjea el enlace mágico e inicia sesión SOLO si el usuario es administrador.
 *
 * La verificación del rol usa la MISMA conexión que acaba de iniciar la sesión:
 * las cookies nuevas aún no son legibles en esta petición. Si el usuario no es
 * administrador, esa sesión se cierra de inmediato y nunca queda activa.
 */
export async function iniciarSesionConEnlace(
  tokenHash: string,
): Promise<"admin" | "sin-acceso" | "enlace-invalido"> {
  const supabase = await crearClienteServidor();

  const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
  if (error) return "enlace-invalido";

  const { data: esAdmin, error: errorRol } = await supabase.rpc("is_admin");
  if (errorRol || esAdmin !== true) {
    await supabase.auth.signOut({ scope: "local" });
    return "sin-acceso";
  }
  return "admin";
}

/** Cierra la sesión solo en este dispositivo (scope "local"). */
export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
}
