import type { Tables } from "./database";

/**
 * Contenido del sitio web, editable desde el panel (/admin/sitio).
 * Convención: "" (texto vacío) = dato aún no configurado; el sitio oculta lo que falta.
 */

export type Destacado = { valor: string; etiqueta: string };

export type ConfiguracionSitio = Omit<
  Tables<"configuracion_sitio">,
  "id" | "destacados" | "updated_at"
> & { destacados: Destacado[] };

export type Servicio = Pick<Tables<"servicios">, "id" | "titulo" | "descripcion" | "icono">;
export type Razon = Pick<Tables<"razones">, "id" | "titulo" | "descripcion" | "icono">;
export type Testimonio = Pick<Tables<"testimonios">, "id" | "texto" | "autor" | "relacion">;
export type PreguntaFrecuente = Pick<
  Tables<"preguntas_frecuentes">,
  "id" | "pregunta" | "respuesta"
>;
export type Foto = Pick<Tables<"fotos">, "id" | "ruta" | "alt" | "ancho" | "alto">;

export type ContenidoSitio = {
  config: ConfiguracionSitio;
  servicios: Servicio[];
  razones: Razon[];
  testimonios: Testimonio[];
  preguntas: PreguntaFrecuente[];
  fotos: Foto[];
};

/** Listas editables desde el panel (tabla de la base de datos → nombre en la URL). */
export const LISTAS = {
  servicios: "servicios",
  razones: "razones",
  testimonios: "testimonios",
  preguntas: "preguntas_frecuentes",
} as const;

export type TipoLista = keyof typeof LISTAS;
export type TablaLista = (typeof LISTAS)[TipoLista];
