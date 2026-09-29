import "server-only";

import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteSinSesion } from "@/lib/supabase/sin-sesion";
import { z } from "@/lib/zod";
import type {
  ConfiguracionSitio,
  ContenidoSitio,
  Destacado,
  TablaLista,
  TramoHorario,
} from "@/types/contenido";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

import { ErrorRepositorio } from "./errores";

/** Bucket de Storage con las fotos del sitio (público para lectura). */
export const BUCKET_FOTOS = "sitio";

const esquemaDestacados = z.array(z.object({ valor: z.string(), etiqueta: z.string() })).catch([]);

// La base de datos ya valida el formato (CHECK); aquí solo se tipa, con respaldo vacío.
const esquemaTramos = z
  .array(z.object({ dias: z.array(z.number()), desde: z.string(), hasta: z.string() }))
  .catch([]);

function aConfiguracion(fila: Tables<"configuracion_sitio">): ConfiguracionSitio {
  const { id, updated_at, destacados, horario_tramos, ...resto } = fila;
  return {
    ...resto,
    destacados: esquemaDestacados.parse(destacados) as Destacado[],
    horario_tramos: esquemaTramos.parse(horario_tramos) as TramoHorario[],
  };
}

/**
 * Contenido público del sitio. Usa el cliente SIN sesión (rol anon): no lee cookies,
 * por lo que las páginas públicas pueden seguir siendo estáticas.
 */
export async function leerContenidoPublico(): Promise<ContenidoSitio> {
  const supabase = crearClienteSinSesion();

  const [config, servicios, razones, testimonios, preguntas, fotos] = await Promise.all([
    supabase.from("configuracion_sitio").select("*").single(),
    supabase
      .from("servicios")
      .select("id, titulo, descripcion, icono")
      .order("orden")
      .order("created_at"),
    supabase
      .from("razones")
      .select("id, titulo, descripcion, icono")
      .order("orden")
      .order("created_at"),
    supabase
      .from("testimonios")
      .select("id, texto, autor, relacion")
      .order("orden")
      .order("created_at"),
    supabase
      .from("preguntas_frecuentes")
      .select("id, pregunta, respuesta")
      .order("orden")
      .order("created_at"),
    supabase.from("fotos").select("id, ruta, alt, ancho, alto").order("orden").order("created_at"),
  ]);

  const error =
    config.error ??
    servicios.error ??
    razones.error ??
    testimonios.error ??
    preguntas.error ??
    fotos.error;
  if (error) throw new ErrorRepositorio("leer_contenido", error.code);

  return {
    config: aConfiguracion(config.data!),
    servicios: servicios.data!,
    razones: razones.data!,
    testimonios: testimonios.data!,
    preguntas: preguntas.data!,
    fotos: fotos.data!,
  };
}

/** Solo la configuración (ej: destinatario de los avisos por correo). */
export async function leerConfiguracion(): Promise<ConfiguracionSitio> {
  const supabase = crearClienteSinSesion();
  const { data, error } = await supabase.from("configuracion_sitio").select("*").single();
  if (error) throw new ErrorRepositorio("leer_configuracion", error.code);
  return aConfiguracion(data);
}

// -----------------------------------------------------------------------------
// Escritura desde el panel: usa la sesión del usuario (cookies). RLS solo permite
// modificar si tiene el rol "sitio"; si no, no se afecta ninguna fila (→ false).
// -----------------------------------------------------------------------------

export async function actualizarConfiguracion(
  campos: TablesUpdate<"configuracion_sitio">,
): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("configuracion_sitio")
    .update(campos)
    .eq("id", true)
    .select("id");
  if (error) throw new ErrorRepositorio("actualizar_configuracion", error.code);
  return data.length === 1;
}

/**
 * Las cuatro listas comparten las mismas operaciones. El tipo de cada fila lo
 * garantiza el validador Zod de su lista (antes de llegar aquí) y las restricciones
 * de la tabla; por eso se usa un único tipo de consulta para todas.
 */
type DatosLista = Record<string, string | number>;

function consultaLista(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  tabla: TablaLista,
) {
  return supabase.from(tabla as "servicios");
}

/** Crea un elemento al final de la lista. */
export async function crearElemento(tabla: TablaLista, datos: DatosLista): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data: ultimo } = await consultaLista(supabase, tabla)
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await consultaLista(supabase, tabla)
    .insert({ ...datos, orden: (ultimo?.orden ?? -1) + 1 } as TablesInsert<"servicios">)
    .select("id");
  if (error) throw new ErrorRepositorio(`crear_${tabla}`, error.code);
  return data.length === 1;
}

export async function actualizarElemento(
  tabla: TablaLista,
  id: string,
  datos: DatosLista,
): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data, error } = await consultaLista(supabase, tabla)
    .update(datos as TablesUpdate<"servicios">)
    .eq("id", id)
    .select("id");
  if (error) throw new ErrorRepositorio(`actualizar_${tabla}`, error.code);
  return data.length === 1;
}

export async function eliminarElemento(tabla: TablaLista, id: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data, error } = await consultaLista(supabase, tabla).delete().eq("id", id).select("id");
  if (error) throw new ErrorRepositorio(`eliminar_${tabla}`, error.code);
  return data.length === 1;
}

/** Sube o baja un elemento una posición, reescribiendo el orden de toda la lista. */
export async function moverElemento(
  tabla: TablaLista | "fotos",
  id: string,
  direccion: "arriba" | "abajo",
): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const consulta = () => supabase.from(tabla as "servicios");

  const { data: filas, error } = await consulta().select("id").order("orden").order("created_at");
  if (error) throw new ErrorRepositorio(`ordenar_${tabla}`, error.code);

  const ids = filas.map((f) => f.id);
  const posicion = ids.indexOf(id);
  const destino = direccion === "arriba" ? posicion - 1 : posicion + 1;
  if (posicion < 0 || destino < 0 || destino >= ids.length) return false;
  [ids[posicion], ids[destino]] = [ids[destino]!, ids[posicion]!];

  const resultados = await Promise.all(
    ids.map((idFila, orden) => consulta().update({ orden }).eq("id", idFila).select("id")),
  );
  const fallo = resultados.find((r) => r.error);
  if (fallo?.error) throw new ErrorRepositorio(`ordenar_${tabla}`, fallo.error.code);
  return resultados.every((r) => r.data?.length === 1);
}

// -----------------------------------------------------------------------------
// Fotos: archivo en Storage + fila en la tabla "fotos" (o en la configuración, para
// la foto de portada). Las rutas usan un UUID: nunca el nombre original del archivo.
// -----------------------------------------------------------------------------

export async function subirArchivoFoto(ruta: string, archivo: Blob, tipo: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, archivo, {
    contentType: tipo,
    upsert: false,
    // El nombre es único (UUID) y nunca cambia: se puede guardar en caché un año.
    cacheControl: "31536000",
  });
  if (error) throw new ErrorRepositorio("subir_foto", error.name);
}

export async function eliminarArchivoFoto(ruta: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.storage.from(BUCKET_FOTOS).remove([ruta]);
  if (error) throw new ErrorRepositorio("eliminar_archivo_foto", error.name);
}

export async function crearFoto(datos: TablesInsert<"fotos">): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data: ultimo } = await supabase
    .from("fotos")
    .select("orden")
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("fotos")
    .insert({ ...datos, orden: (ultimo?.orden ?? -1) + 1 })
    .select("id");
  if (error) throw new ErrorRepositorio("crear_foto", error.code);
  return data.length === 1;
}

export async function actualizarTextoFoto(id: string, alt: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("fotos").update({ alt }).eq("id", id).select("id");
  if (error) throw new ErrorRepositorio("actualizar_foto", error.code);
  return data.length === 1;
}

/** Borra la fila y devuelve la ruta del archivo (para borrarlo de Storage), o null. */
export async function eliminarFoto(id: string): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("fotos").delete().eq("id", id).select("ruta");
  if (error) throw new ErrorRepositorio("eliminar_foto", error.code);
  return data[0]?.ruta ?? null;
}
