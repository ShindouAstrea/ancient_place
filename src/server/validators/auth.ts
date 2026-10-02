import { z } from "@/lib/zod";

const campoEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: "Ingresa tu correo." })
  .max(254, { error: "El correo es demasiado largo." })
  .pipe(z.email({ error: "Ingresa un correo válido, por ejemplo nombre@correo.cl." }));

/** Inicio de sesión del panel. Se usa en el cliente y en el servidor. */
export const esquemaInicioSesion = z.object({
  email: campoEmail,
  // Sin trim: los espacios pueden ser parte de la contraseña. 72 es el máximo de Supabase Auth.
  password: z
    .string()
    .min(1, { error: "Ingresa tu contraseña." })
    .max(72, { error: "La contraseña es demasiado larga." }),
});

export type CampoInicioSesion = keyof z.input<typeof esquemaInicioSesion>;

/** Estado que la Server Action de inicio de sesión devuelve al formulario (si hay éxito, redirige). */
export type EstadoInicioSesion =
  | { estado: "inicial" }
  | {
      estado: "error";
      mensaje: string;
      errores?: Partial<Record<CampoInicioSesion, string>>;
      /** Tras credenciales inválidas se vacía la contraseña y se enfoca ese campo. */
      limpiarContrasena?: boolean;
    };

/**
 * Largo mínimo de contraseña: debe coincidir con Supabase (config.toml y Dashboard) y con
 * privado.validar_contrasena() en la base de datos.
 */
export const LARGO_MINIMO_CONTRASENA = 8;

const campoNuevaContrasena = z
  .string()
  .min(LARGO_MINIMO_CONTRASENA, {
    error: `La nueva contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`,
  })
  .max(72, { error: "La nueva contraseña puede tener hasta 72 caracteres." });

const campoRepetir = z.string().min(1, { error: "Repite la nueva contraseña." });

/** Cambio de contraseña desde "Mi cuenta". Se usa en el cliente y en el servidor. */
export const esquemaCambioContrasena = z
  .object({
    actual: z
      .string()
      .min(1, { error: "Ingresa tu contraseña actual." })
      .max(72, { error: "La contraseña es demasiado larga." }),
    nueva: campoNuevaContrasena,
    repetir: campoRepetir,
  })
  .superRefine((datos, ctx) => {
    if (datos.repetir && datos.nueva !== datos.repetir) {
      ctx.addIssue({ code: "custom", path: ["repetir"], message: "Las contraseñas no coinciden." });
    }
    if (datos.nueva && datos.nueva === datos.actual) {
      ctx.addIssue({
        code: "custom",
        path: ["nueva"],
        message: "La nueva contraseña debe ser distinta de la actual.",
      });
    }
  });

export type CampoCambioContrasena = keyof z.input<typeof esquemaCambioContrasena>;

export type EstadoCambioContrasena =
  | { estado: "inicial" }
  | { estado: "exito" }
  | { estado: "error"; mensaje: string; errores?: Partial<Record<CampoCambioContrasena, string>> };

/** "¿Olvidaste tu contraseña?": solo el correo. Se usa en el cliente y en el servidor. */
export const esquemaSolicitudRecuperacion = z.object({ email: campoEmail });

export type CampoSolicitudRecuperacion = keyof z.input<typeof esquemaSolicitudRecuperacion>;

export type EstadoSolicitudRecuperacion =
  | { estado: "inicial" }
  /** Mismo resultado exista o no la cuenta: no revela qué correos son administradores. */
  | { estado: "exito"; email: string }
  | {
      estado: "error";
      mensaje: string;
      errores?: Partial<Record<CampoSolicitudRecuperacion, string>>;
    };

/**
 * token_hash del enlace del correo: hash hexadecimal que genera Supabase Auth (con prefijo
 * "pkce_" si la solicitud usó PKCE). Validar el formato evita enviar basura a Auth.
 */
export const esquemaTokenRecuperacion = z.string().regex(/^(pkce_)?[0-9a-f]{56}$/);

/** Nueva contraseña con el enlace del correo. Se usa en el cliente y en el servidor. */
export const esquemaRestablecimiento = z
  .object({
    nueva: campoNuevaContrasena,
    repetir: campoRepetir,
  })
  .superRefine((datos, ctx) => {
    if (datos.repetir && datos.nueva !== datos.repetir) {
      ctx.addIssue({ code: "custom", path: ["repetir"], message: "Las contraseñas no coinciden." });
    }
  });

export type CampoRestablecimiento = keyof z.input<typeof esquemaRestablecimiento>;

/**
 * Si todo está bien, el servidor redirige al login. `siguiente` indica errores tras los
 * que el enlace ya no sirve (vencido o ya usado): en vez del formulario se ofrece el paso
 * que corresponde.
 */
export type EstadoRestablecimiento =
  | { estado: "inicial" }
  | {
      estado: "error";
      mensaje: string;
      errores?: Partial<Record<CampoRestablecimiento, string>>;
      siguiente?: "nuevo-enlace" | "ingresar";
    };

/**
 * Ruta a la que volver después de ingresar (?siguiente=...). Solo se aceptan rutas
 * internas del panel: evita que un enlace malicioso redirija a otro sitio después del
 * login (open redirect). Devuelve null si no es segura.
 */
export function rutaSiguienteSegura(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.length > 200) return null;
  if (!/^\/admin(\/[A-Za-z0-9_-]+)*$/.test(valor)) return null;
  if (valor === "/admin/login") return null;
  return valor;
}

/** Motivos que el login puede mostrar (vienen en ?motivo=...). */
export const MOTIVOS_LOGIN = [
  "sin-acceso",
  "sesion-cerrada",
  "sesion-requerida",
  "contrasena-restablecida",
] as const;
export type MotivoLogin = (typeof MOTIVOS_LOGIN)[number];
