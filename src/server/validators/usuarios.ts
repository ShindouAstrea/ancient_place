import { z } from "@/lib/zod";
import { Constants } from "@/types/database";

/** Cuentas del panel (/admin/usuarios). Se usa en el navegador y en el servidor; la base repite las reglas. */

export const ROLES = Constants.public.Enums.rol_admin;

const nombre = z
  .string()
  .trim()
  .min(1, { error: "Ingresa el nombre de la persona." })
  .max(100, { error: "Puede tener hasta 100 caracteres." });

const roles = z
  .array(z.enum(ROLES))
  .min(1, { error: "Elige al menos un permiso." })
  .transform((lista) => [...new Set(lista)]);

export const esquemaNuevaCuenta = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Ingresa el correo de la persona." })
    .max(254, { error: "El correo es demasiado largo." })
    .pipe(z.email({ error: "Ingresa un correo válido, por ejemplo nombre@correo.cl." })),
  nombre,
  roles,
});

export const esquemaEdicionCuenta = z.object({ nombre, roles });

export type DatosNuevaCuenta = z.output<typeof esquemaNuevaCuenta>;
export type DatosEdicionCuenta = z.output<typeof esquemaEdicionCuenta>;

/** Orden de los campos en pantalla: el foco va al primero con error. */
export const CAMPOS_CUENTA = ["email", "nombre", "roles"] as const;

/** Datos del formulario. Cada casilla de permiso marcada llega como un valor "roles". */
export function cuentaDesdeFormulario(formData: FormData) {
  const texto = (campo: string) => {
    const valor = formData.get(campo);
    return typeof valor === "string" ? valor : "";
  };
  return {
    email: texto("email"),
    nombre: texto("nombre"),
    roles: formData.getAll("roles").filter((valor) => typeof valor === "string"),
  };
}

/**
 * Estado que devuelven las acciones de cuentas. `contrasena`: la contraseña temporal
 * recién generada, que se muestra UNA vez y no se guarda en ningún lado. `creada`: la
 * cuenta recién creada.
 */
export type EstadoCuenta =
  | { estado: "inicial" }
  | {
      estado: "exito";
      mensaje: string;
      contrasena?: string;
      creada?: { id: string; email: string; nombre: string };
    }
  | { estado: "error"; mensaje: string; errores?: Partial<Record<string, string>> };

/** Mensajes para las reglas que valida la base de datos (códigos de las funciones de cuentas). */
export const MENSAJES_REGLA_CUENTA: Record<string, string> = {
  correo_existente:
    "Ya existe una cuenta con ese correo. Si está desactivada, búscala en la lista y reactívala.",
  correo_invalido: "Ingresa un correo válido, por ejemplo nombre@correo.cl.",
  nombre_invalido: "Ingresa el nombre de la persona (hasta 100 caracteres).",
  roles_invalidos: "Elige al menos un permiso.",
  cuenta_inexistente: "Esta cuenta ya no existe. Vuelve a la lista de usuarios.",
  cuenta_desactivada: "La cuenta está desactivada: reactívala primero.",
};
