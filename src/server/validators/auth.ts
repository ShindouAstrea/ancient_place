import { z } from "zod";

/** Solicitud de enlace de acceso al panel. Se usa en el cliente y en el servidor. */
export const esquemaSolicitudAcceso = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Ingresa tu correo." })
    .max(254, { error: "El correo es demasiado largo." })
    .pipe(z.email({ error: "Ingresa un correo válido, por ejemplo nombre@correo.cl." })),
});

/**
 * Datos del enlace mágico (vienen en la URL del correo). Solo se acepta el tipo
 * "email" (enlace mágico); el token se valida por forma antes de enviarlo a Supabase.
 */
export const esquemaConfirmacionAcceso = z.object({
  token_hash: z.string().regex(/^[A-Za-z0-9_-]{16,256}$/),
  type: z.literal("email"),
});

/** Estado que la Server Action de acceso devuelve al formulario. */
export type EstadoSolicitudAcceso =
  | { estado: "inicial" }
  | { estado: "enviado" }
  | { estado: "error"; mensaje: string; errorEmail?: string };

/** Motivos que el login puede mostrar (vienen en ?motivo=...). */
export const MOTIVOS_LOGIN = [
  "enlace-invalido",
  "sin-acceso",
  "sesion-cerrada",
  "sesion-requerida",
] as const;
export type MotivoLogin = (typeof MOTIVOS_LOGIN)[number];
