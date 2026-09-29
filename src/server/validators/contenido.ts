import { z } from "zod";

import { NOMBRES_ICONOS } from "@/config/iconos";
import type { TipoLista } from "@/types/contenido";

import { normalizarTelefonoChileno } from "./contacto";

/**
 * Validación de lo que se edita desde el panel (/admin/sitio). El servidor es la
 * fuente de verdad; la base de datos repite los límites con restricciones CHECK.
 * Convención: "" (vacío) = dato no configurado; el sitio oculta lo que falta.
 */

const texto = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo, { error: `Puede tener hasta ${maximo} caracteres.` });

const textoObligatorio = (maximo: number, mensaje: string) =>
  z
    .string()
    .trim()
    .min(1, { error: mensaje })
    .max(maximo, {
      error: `Puede tener hasta ${maximo} caracteres.`,
    });

/** Teléfono chileno opcional: vacío o normalizado a +56XXXXXXXXX. */
const telefonoOpcional = z
  .string()
  .trim()
  .transform((valor, ctx) => {
    if (!valor) return "";
    const normalizado = normalizarTelefonoChileno(valor);
    if (!normalizado) {
      ctx.addIssue({
        code: "custom",
        message: "Ingresa un teléfono chileno válido, por ejemplo +56 9 1234 5678.",
      });
      return z.NEVER;
    }
    return normalizado;
  });

const emailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((valor) => !valor || z.email().safeParse(valor).success, {
    error: "Ingresa un correo válido, por ejemplo nombre@dominio.cl.",
  });

/** Remitente de correos: "correo@dominio.cl" o "Nombre <correo@dominio.cl>". */
const remitenteOpcional = z
  .string()
  .trim()
  .max(200)
  .refine(
    (valor) => {
      if (!valor) return true;
      const conNombre = /^[^<>]{1,100}<([^<>\s]+)>$/.exec(valor);
      return z.email().safeParse(conNombre ? conNombre[1] : valor).success;
    },
    { error: "Usa el formato correo@dominio.cl o Nombre <correo@dominio.cl>." },
  );

/**
 * Mapa de Google: acepta la URL de inserción o el código <iframe> completo que
 * entrega Google Maps (Compartir → Insertar un mapa), y extrae la URL.
 */
const mapaEmbedOpcional = z
  .string()
  .trim()
  .transform((valor) => {
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(valor)?.[1] ?? valor;
    return src.replaceAll("&amp;", "&");
  })
  .refine((valor) => !valor || valor.startsWith("https://www.google.com/maps/embed?"), {
    error:
      "Pega el código de Google Maps → Compartir → «Insertar un mapa» (debe empezar con https://www.google.com/maps/embed?).",
  })
  .refine((valor) => valor.length <= 2000, { error: "La URL es demasiado larga." });

const urlOpcional = z
  .string()
  .trim()
  .max(500)
  .refine((valor) => !valor || /^https:\/\/\S+$/.test(valor), {
    error: "Ingresa un enlace que comience con https://",
  });

/** Valida el dígito verificador de un RUT chileno (módulo 11). */
export function rutValido(rut: string): boolean {
  const limpio = rut.replace(/[.\s-]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const esperado = 11 - (suma % 11);
  const dv = esperado === 11 ? "0" : esperado === 10 ? "K" : String(esperado);
  return limpio.endsWith(dv);
}

const rutOpcional = z
  .string()
  .trim()
  .max(20)
  .refine((valor) => !valor || rutValido(valor), { error: "El RUT no es válido." });

// -----------------------------------------------------------------------------
// Secciones del formulario "Información del sitio". Cada una guarda sus columnas.
// -----------------------------------------------------------------------------

export const esquemasSeccion = {
  hogar: z.object({
    nombre: textoObligatorio(100, "Ingresa el nombre del hogar."),
    descripcion_corta: texto(300),
  }),
  contacto: z.object({
    whatsapp: telefonoOpcional,
    mensaje_whatsapp: texto(500),
    telefono: telefonoOpcional,
    email_contacto: emailOpcional,
  }),
  avisos: z.object({
    email_notificaciones: emailOpcional,
    email_remitente: remitenteOpcional,
  }),
  ubicacion: z.object({
    direccion: texto(200),
    ciudad: texto(100),
    region: texto(100),
    horario_visitas: texto(300),
    maps_embed_url: mapaEmbedOpcional,
    maps_url: urlOpcional,
  }),
  portada: z.object({
    hero_titulo: textoObligatorio(150, "Ingresa el título de la portada."),
    hero_subtitulo: texto(300),
  }),
  nosotros: z
    .object({
      nosotros_texto: texto(3000),
      destacado_valor_1: texto(20),
      destacado_etiqueta_1: texto(60),
      destacado_valor_2: texto(20),
      destacado_etiqueta_2: texto(60),
      destacado_valor_3: texto(20),
      destacado_etiqueta_3: texto(60),
      destacado_valor_4: texto(20),
      destacado_etiqueta_4: texto(60),
    })
    // Los 4 pares de campos se guardan como una lista; se descartan los vacíos.
    .transform(({ nosotros_texto, ...d }) => ({
      nosotros_texto,
      destacados: ([1, 2, 3, 4] as const)
        .map((n) => ({ valor: d[`destacado_valor_${n}`], etiqueta: d[`destacado_etiqueta_${n}`] }))
        .filter((x) => x.valor || x.etiqueta),
    })),
  textos: z.object({
    servicios_intro: texto(300),
    instalaciones_intro: texto(300),
  }),
  privacidad: z.object({
    razon_social: texto(150),
    rut: rutOpcional,
    email_privacidad: emailOpcional,
    plazo_conservacion: texto(200),
    plazo_respuesta: texto(200),
    fecha_privacidad: texto(50),
  }),
} as const;

export type SeccionInformacion = keyof typeof esquemasSeccion;

export function esSeccionInformacion(valor: string): valor is SeccionInformacion {
  return valor in esquemasSeccion;
}

// -----------------------------------------------------------------------------
// Listas (servicios, razones, testimonios, preguntas frecuentes).
// -----------------------------------------------------------------------------

const icono = z.enum(NOMBRES_ICONOS, { error: "Elige un ícono de la lista." });

export const esquemasLista = {
  servicios: z.object({
    titulo: textoObligatorio(100, "Ingresa el nombre del servicio."),
    descripcion: texto(500),
    icono,
  }),
  razones: z.object({
    titulo: textoObligatorio(100, "Ingresa el título."),
    descripcion: texto(500),
    icono,
  }),
  testimonios: z.object({
    texto: textoObligatorio(800, "Ingresa el testimonio."),
    autor: textoObligatorio(100, "Ingresa quién lo entrega (nombre o iniciales)."),
    relacion: texto(100),
  }),
  preguntas: z.object({
    pregunta: textoObligatorio(200, "Ingresa la pregunta."),
    respuesta: textoObligatorio(2000, "Ingresa la respuesta."),
  }),
} as const satisfies Record<TipoLista, z.ZodType>;

export function esTipoLista(valor: string): valor is TipoLista {
  return valor in esquemasLista;
}

export const esquemaId = z.uuid();

// -----------------------------------------------------------------------------
// Fotos
// -----------------------------------------------------------------------------

export const TIPOS_IMAGEN = ["image/webp", "image/jpeg", "image/png"] as const;
export const TAMANO_MAXIMO_FOTO = 3 * 1024 * 1024;

export const esquemaDatosFoto = z.object({
  alt: textoObligatorio(
    200,
    "Describe brevemente la foto (ayuda a personas con discapacidad visual).",
  ),
  ancho: z.coerce.number().int().min(1).max(10000),
  alto: z.coerce.number().int().min(1).max(10000),
});

export const esquemaTextoFoto = z.object({
  id: z.uuid(),
  alt: textoObligatorio(200, "Describe brevemente la foto."),
});

/** Estado genérico de los formularios del panel de contenido. */
export type EstadoEdicion =
  | { estado: "inicial" }
  | { estado: "exito"; mensaje: string }
  | { estado: "error"; mensaje: string; errores?: Partial<Record<string, string>> };
