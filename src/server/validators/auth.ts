import { z } from "zod";

/** Inicio de sesión del panel. Se usa en el cliente y en el servidor. */
export const esquemaInicioSesion = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Ingresa tu correo." })
    .max(254, { error: "El correo es demasiado largo." })
    .pipe(z.email({ error: "Ingresa un correo válido, por ejemplo nombre@correo.cl." })),
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

/** Motivos que el login puede mostrar (vienen en ?motivo=...). */
export const MOTIVOS_LOGIN = ["sin-acceso", "sesion-cerrada", "sesion-requerida"] as const;
export type MotivoLogin = (typeof MOTIVOS_LOGIN)[number];
