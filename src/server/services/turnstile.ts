import "server-only";

import { randomUUID } from "node:crypto";

import { captcha, envServidor } from "@/lib/env";
import { z } from "@/lib/zod";

const URL_VERIFICACION = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const esquemaRespuesta = z.object({
  success: z.boolean(),
  action: z.string().optional(),
  "error-codes": z.array(z.string()).default([]),
});

/**
 * Verifica en el servidor el token que Cloudflare Turnstile entregó al navegador.
 * Sin esta verificación, el widget no protege nada: un bot podría omitirlo.
 *
 * Falla de forma cerrada: ante cualquier error (red, tiempo de espera, respuesta
 * inesperada) se considera NO verificado.
 *
 * Con el CAPTCHA desactivado (NEXT_PUBLIC_TURNSTILE_ENABLED="false") no hay nada que
 * verificar y se acepta la solicitud; siguen activos el honeypot y el rate limit.
 */
export async function verificarTurnstile(
  token: string,
  ip: string | null,
  accionEsperada: string,
): Promise<boolean> {
  if (!captcha.activo) return true;

  // Los tokens válidos tienen como máximo 2048 caracteres.
  if (!token || token.length > 2048) return false;

  const cuerpo = new URLSearchParams({
    // Con el CAPTCHA activo, la validación de env.ts garantiza que existe.
    secret: envServidor().TURNSTILE_SECRET_KEY ?? "",
    response: token,
    // Permite reintentar la verificación sin que el token cuente como reutilizado.
    idempotency_key: randomUUID(),
  });
  if (ip) cuerpo.set("remoteip", ip);

  try {
    const respuesta = await fetch(URL_VERIFICACION, {
      method: "POST",
      body: cuerpo,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const resultado = esquemaRespuesta.safeParse(await respuesta.json());
    if (!resultado.success) {
      console.error("[turnstile] Respuesta con formato inesperado");
      return false;
    }

    const datos = resultado.data;
    if (!datos.success) {
      // Los códigos de error no contienen datos personales.
      console.warn("[turnstile] Verificación rechazada:", datos["error-codes"].join(", "));
      return false;
    }
    // Evita reutilizar un token emitido para otro formulario del sitio.
    // (Las claves de prueba de Cloudflare no devuelven "action".)
    if (datos.action && datos.action !== accionEsperada) {
      console.warn("[turnstile] Acción inesperada en el token");
      return false;
    }
    return true;
  } catch {
    console.error("[turnstile] No se pudo contactar el servicio de verificación");
    return false;
  }
}
