import { z } from "zod";

import { siteConfig } from "@/config/site";

/**
 * Validación del formulario de contacto. Se usa en el cliente (respuesta inmediata)
 * y en el servidor, que es la FUENTE DE VERDAD: nunca se confía en lo que envía
 * el navegador. Este módulo no debe importar nada exclusivo del servidor.
 */

/**
 * Normaliza un teléfono chileno a formato E.164 (+56 y 9 dígitos).
 * Acepta, por ejemplo: "+56 9 1234 5678", "56912345678", "9 1234 5678",
 * "912345678", "(2) 2345 6789" y el antiguo prefijo "09 1234 5678".
 * Devuelve null si no es un número chileno válido (celular o fijo).
 */
export function normalizarTelefonoChileno(valor: string): string | null {
  let digitos = valor.replace(/\D/g, "");
  if (digitos.length === 11 && digitos.startsWith("56")) digitos = digitos.slice(2);
  if (digitos.length === 10 && digitos.startsWith("0")) digitos = digitos.slice(1);
  // Celulares comienzan con 9; fijos con el código de área (2 a 7).
  return /^[2-9]\d{8}$/.test(digitos) ? `+56${digitos}` : null;
}

const parentescos = siteConfig.contactoSeccion.parentescos;

export const esquemaContacto = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, { error: "Ingresa tu nombre." })
    .max(100, { error: "El nombre puede tener hasta 100 caracteres." }),

  telefono: z
    .string()
    .trim()
    .min(1, { error: "Ingresa tu teléfono." })
    .transform((valor, ctx) => {
      const normalizado = normalizarTelefonoChileno(valor);
      if (!normalizado) {
        ctx.addIssue({
          code: "custom",
          message: "Ingresa un teléfono chileno válido, por ejemplo +56 9 1234 5678.",
        });
        return z.NEVER;
      }
      return normalizado;
    }),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Ingresa tu correo electrónico." })
    .max(254, { error: "El correo es demasiado largo." })
    .pipe(z.email({ error: "Ingresa un correo válido, por ejemplo nombre@correo.cl." })),

  // Opcional: vacío se guarda como null. Solo se aceptan las opciones del formulario.
  parentesco: z
    .union([z.literal(""), z.enum(parentescos)], {
      error: "Selecciona una opción de la lista.",
    })
    .transform((valor) => valor || null),

  mensaje: z
    .string()
    .trim()
    .min(10, { error: "Cuéntanos un poco más (mínimo 10 caracteres)." })
    .max(2000, { error: "El mensaje puede tener hasta 2000 caracteres." }),

  consentimiento: z.literal(true, {
    error: "Debes aceptar el uso de tus datos para que podamos contactarte.",
  }),
});

export type DatosContacto = z.output<typeof esquemaContacto>;
export type CampoContacto = keyof z.input<typeof esquemaContacto>;
export type ErroresContacto = Partial<Record<CampoContacto, string>>;

/** Nombre del campo trampa (honeypot): invisible para personas, atractivo para bots. */
export const CAMPO_TRAMPA = "sitio_web";
/** Nombre que Turnstile usa para el token dentro del formulario. */
export const CAMPO_TURNSTILE = "cf-turnstile-response";

function texto(formData: FormData, campo: string): string {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

/** Extrae los campos del formulario como texto (ignora archivos u otros tipos). */
export function leerFormularioContacto(formData: FormData) {
  return {
    nombre: texto(formData, "nombre"),
    telefono: texto(formData, "telefono"),
    email: texto(formData, "email"),
    parentesco: texto(formData, "parentesco"),
    mensaje: texto(formData, "mensaje"),
    // Una casilla marcada envía "on"; sin marcar no se envía.
    consentimiento: formData.get("consentimiento") === "on",
  };
}

/** Primer mensaje de error de cada campo, listo para mostrar. */
export function erroresPorCampo(error: z.ZodError): ErroresContacto {
  const { fieldErrors } = z.flattenError(error);
  const errores: ErroresContacto = {};
  for (const [campo, mensajes] of Object.entries(fieldErrors) as [CampoContacto, string[]][]) {
    if (mensajes[0]) errores[campo] = mensajes[0];
  }
  return errores;
}

/** Estado que la Server Action devuelve al formulario. */
export type EstadoFormularioContacto =
  | { estado: "inicial" }
  | { estado: "exito" }
  | { estado: "error"; mensaje: string; errores?: ErroresContacto };
