import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cache } from "react";

import {
  actualizarConfiguracion,
  actualizarElemento,
  actualizarTextoFoto,
  crearElemento,
  crearFoto,
  eliminarArchivoFoto,
  eliminarElemento,
  eliminarFoto,
  leerConfiguracion,
  leerContenidoPublico,
  moverElemento,
  subirArchivoFoto,
} from "@/server/repositories/contenido";
import type { ConfiguracionSitio, ContenidoSitio, TipoLista } from "@/types/contenido";
import { LISTAS } from "@/types/contenido";
import type { TablesUpdate } from "@/types/database";

import { requerirRol } from "./auth";

// -----------------------------------------------------------------------------
// Lectura (sitio público)
// -----------------------------------------------------------------------------

/** Contenido sin datos: solo se usa si el build no puede leer la base de datos. */
const CONTENIDO_VACIO: ContenidoSitio = {
  config: {
    nombre: "Hogar de reposo",
    descripcion_corta: "",
    whatsapp: "",
    mensaje_whatsapp: "",
    telefono: "",
    email_contacto: "",
    email_notificaciones: "",
    email_remitente: "",
    direccion: "",
    ciudad: "",
    region: "",
    horario_visitas: "",
    maps_embed_url: "",
    maps_url: "",
    hero_titulo: "",
    hero_subtitulo: "",
    hero_foto: null,
    hero_foto_ancho: null,
    hero_foto_alto: null,
    hero_foto_alt: "",
    nosotros_texto: "",
    destacados: [],
    servicios_intro: "",
    instalaciones_intro: "",
    razon_social: "",
    rut: "",
    email_privacidad: "",
    plazo_conservacion: "",
    plazo_respuesta: "",
    fecha_privacidad: "",
  },
  servicios: [],
  razones: [],
  testimonios: [],
  preguntas: [],
  fotos: [],
};

/**
 * Contenido del sitio, memoizado durante una misma petición.
 *
 * Si la base de datos no responde DURANTE EL BUILD (ej: el build de Docker en CI, que
 * usa una URL de Supabase ficticia), se usa contenido vacío para que el build no
 * falle; las páginas se regeneran solas después (ver `revalidate` en el layout
 * público). En producción, un error se propaga: Next.js sigue mostrando la última
 * versión correcta de la página en vez de una vacía.
 */
export const obtenerContenidoSitio = cache(async (): Promise<ContenidoSitio> => {
  try {
    return await leerContenidoPublico();
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      console.warn(
        "[contenido] No se pudo leer la base de datos durante el build; se usa contenido vacío:",
        (error as Error).message,
      );
      return CONTENIDO_VACIO;
    }
    throw error;
  }
});

/** Datos importantes aún vacíos (se muestran como pendientes en el panel). */
export function camposPendientes(config: ConfiguracionSitio): string[] {
  const revisar: [keyof ConfiguracionSitio, string][] = [
    ["nombre", "Nombre del hogar"],
    ["descripcion_corta", "Descripción breve"],
    ["whatsapp", "WhatsApp"],
    ["telefono", "Teléfono para llamadas"],
    ["email_contacto", "Correo de contacto"],
    ["direccion", "Dirección"],
    ["horario_visitas", "Horario de visitas"],
    ["maps_embed_url", "Mapa de Google"],
    ["email_notificaciones", "Correo para los avisos de nuevos contactos"],
    ["razon_social", "Razón social (política de privacidad)"],
  ];
  return revisar.filter(([campo]) => !String(config[campo] ?? "").trim()).map(([, e]) => e);
}

// -----------------------------------------------------------------------------
// Escritura (panel, rol "sitio")
// -----------------------------------------------------------------------------

/**
 * Tras guardar, marca todas las páginas públicas para regenerarse: la próxima visita
 * ya ve el cambio, sin volver a desplegar.
 */
function publicarCambios() {
  revalidatePath("/", "layout");
}

export async function guardarConfiguracion(
  campos: TablesUpdate<"configuracion_sitio">,
): Promise<boolean> {
  await requerirRol("sitio");
  const ok = await actualizarConfiguracion(campos);
  if (ok) publicarCambios();
  return ok;
}

export async function guardarElementoLista(
  tipo: TipoLista,
  id: string | null,
  datos: Record<string, string>,
): Promise<boolean> {
  await requerirRol("sitio");
  const tabla = LISTAS[tipo];
  const ok = id ? await actualizarElemento(tabla, id, datos) : await crearElemento(tabla, datos);
  if (ok) publicarCambios();
  return ok;
}

export async function eliminarElementoLista(tipo: TipoLista, id: string): Promise<boolean> {
  await requerirRol("sitio");
  const ok = await eliminarElemento(LISTAS[tipo], id);
  if (ok) publicarCambios();
  return ok;
}

export async function moverElementoLista(
  tipo: TipoLista | "fotos",
  id: string,
  direccion: "arriba" | "abajo",
): Promise<boolean> {
  await requerirRol("sitio");
  const ok = await moverElemento(tipo === "fotos" ? "fotos" : LISTAS[tipo], id, direccion);
  if (ok) publicarCambios();
  return ok;
}

// -----------------------------------------------------------------------------
// Fotos
// -----------------------------------------------------------------------------

const EXTENSIONES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" } as const;
type TipoImagen = keyof typeof EXTENSIONES;

/**
 * Tipo real de la imagen según sus primeros bytes ("firma" del formato). No se confía
 * en la extensión ni en el tipo que declara el navegador: ambos se pueden falsificar.
 */
async function detectarTipoImagen(archivo: Blob): Promise<TipoImagen | null> {
  const b = new Uint8Array(await archivo.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const ascii = String.fromCharCode(...b);
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

export type ResultadoFoto = { ok: true } | { ok: false; motivo: "formato" | "permiso" };

async function subirImagen(carpeta: "galeria" | "portada", archivo: Blob) {
  const tipo = await detectarTipoImagen(archivo);
  if (!tipo) return null;
  const ruta = `${carpeta}/${randomUUID()}.${EXTENSIONES[tipo]}`;
  await subirArchivoFoto(ruta, archivo, tipo);
  return ruta;
}

export async function agregarFotoGaleria(
  archivo: Blob,
  datos: { alt: string; ancho: number; alto: number },
): Promise<ResultadoFoto> {
  await requerirRol("sitio");
  const ruta = await subirImagen("galeria", archivo);
  if (!ruta) return { ok: false, motivo: "formato" };

  try {
    if (!(await crearFoto({ ruta, ...datos }))) throw new Error("Sin permiso para crear la foto");
  } catch (error) {
    // Sin fila en la tabla, el archivo quedaría huérfano: se borra.
    await eliminarArchivoFoto(ruta).catch(() => undefined);
    throw error;
  }
  publicarCambios();
  return { ok: true };
}

export async function cambiarTextoFoto(id: string, alt: string): Promise<boolean> {
  await requerirRol("sitio");
  const ok = await actualizarTextoFoto(id, alt);
  if (ok) publicarCambios();
  return ok;
}

export async function quitarFotoGaleria(id: string): Promise<boolean> {
  await requerirRol("sitio");
  const ruta = await eliminarFoto(id);
  if (!ruta) return false;
  await eliminarArchivoFoto(ruta);
  publicarCambios();
  return true;
}

export async function cambiarFotoPortada(
  archivo: Blob,
  datos: { alt: string; ancho: number; alto: number },
): Promise<ResultadoFoto> {
  await requerirRol("sitio");
  const anterior = (await leerConfiguracion()).hero_foto;
  const ruta = await subirImagen("portada", archivo);
  if (!ruta) return { ok: false, motivo: "formato" };

  const ok = await actualizarConfiguracion({
    hero_foto: ruta,
    hero_foto_alt: datos.alt,
    hero_foto_ancho: datos.ancho,
    hero_foto_alto: datos.alto,
  }).catch(async (error) => {
    await eliminarArchivoFoto(ruta).catch(() => undefined);
    throw error;
  });
  if (!ok) {
    await eliminarArchivoFoto(ruta).catch(() => undefined);
    return { ok: false, motivo: "permiso" };
  }
  if (anterior) await eliminarArchivoFoto(anterior).catch(() => undefined);
  publicarCambios();
  return { ok: true };
}

export async function quitarFotoPortada(): Promise<boolean> {
  await requerirRol("sitio");
  const anterior = (await leerConfiguracion()).hero_foto;
  const ok = await actualizarConfiguracion({
    hero_foto: null,
    hero_foto_alt: "",
    hero_foto_ancho: null,
    hero_foto_alto: null,
  });
  if (ok && anterior) await eliminarArchivoFoto(anterior).catch(() => undefined);
  if (ok) publicarCambios();
  return ok;
}

export async function cambiarTextoPortada(alt: string): Promise<boolean> {
  return guardarConfiguracion({ hero_foto_alt: alt });
}
