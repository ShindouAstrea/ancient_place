"use server";

import { unstable_rethrow } from "next/navigation";

import {
  agregarFotoGaleria,
  cambiarFotoPortada,
  cambiarTextoFoto,
  cambiarTextoPortada,
  eliminarElementoLista,
  guardarConfiguracion,
  guardarElementoLista,
  moverElementoLista,
  quitarFotoGaleria,
  quitarFotoPortada,
} from "@/server/services/contenido";
import {
  TAMANO_MAXIMO_FOTO,
  esSeccionInformacion,
  esTipoLista,
  esquemaDatosFoto,
  esquemaId,
  esquemaTextoFoto,
  esquemasLista,
  esquemasSeccion,
  type EstadoEdicion,
} from "@/server/validators/contenido";
import { erroresPorCampo } from "@/server/validators/contacto";

const GUARDADO = "Cambios guardados. El sitio ya muestra la nueva información.";
const SIN_PERMISO = "No tienes permiso para editar el sitio.";
const ERROR_INTERNO = "No pudimos guardar los cambios. Inténtalo en unos minutos.";
const REVISAR = "Revisa los campos marcados.";

/** Campos de texto del formulario (ignora archivos y campos internos de Next.js). */
function textos(formData: FormData): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [clave, valor] of formData.entries()) {
    if (typeof valor === "string" && !clave.startsWith("$ACTION")) salida[clave] = valor;
  }
  return salida;
}

/** Ejecuta una operación del servicio con manejo de errores común (sin datos personales). */
async function ejecutar(
  operacion: string,
  accion: () => Promise<boolean>,
  mensajeExito = GUARDADO,
): Promise<EstadoEdicion> {
  try {
    return (await accion())
      ? { estado: "exito", mensaje: mensajeExito }
      : { estado: "error", mensaje: SIN_PERMISO };
  } catch (error) {
    unstable_rethrow(error); // deja pasar la redirección al login si la sesión venció
    console.error(`[sitio] Error al ${operacion}:`, (error as Error).message);
    return { estado: "error", mensaje: ERROR_INTERNO };
  }
}

/** Guarda una sección del formulario "Información del sitio". */
export async function guardarSeccion(
  seccion: string,
  _estadoAnterior: EstadoEdicion,
  formData: FormData,
): Promise<EstadoEdicion> {
  if (!esSeccionInformacion(seccion)) return { estado: "error", mensaje: ERROR_INTERNO };

  const validacion = esquemasSeccion[seccion].safeParse(textos(formData));
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }
  return ejecutar("guardar la información", () => guardarConfiguracion(validacion.data));
}

/** Crea (sin id) o actualiza (con id) un elemento de una lista. */
export async function guardarElemento(
  tipo: string,
  _estadoAnterior: EstadoEdicion,
  formData: FormData,
): Promise<EstadoEdicion> {
  if (!esTipoLista(tipo)) return { estado: "error", mensaje: ERROR_INTERNO };

  const { id, ...campos } = textos(formData);
  if (id && !esquemaId.safeParse(id).success) return { estado: "error", mensaje: ERROR_INTERNO };

  const validacion = esquemasLista[tipo].safeParse(campos);
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }
  return ejecutar(`guardar en ${tipo}`, () =>
    guardarElementoLista(tipo, id || null, validacion.data as Record<string, string>),
  );
}

export async function eliminarElemento(tipo: string, id: string): Promise<EstadoEdicion> {
  if (!esTipoLista(tipo) || !esquemaId.safeParse(id).success) {
    return { estado: "error", mensaje: ERROR_INTERNO };
  }
  return ejecutar(`eliminar en ${tipo}`, () => eliminarElementoLista(tipo, id), "Eliminado.");
}

export async function moverElemento(
  tipo: string,
  id: string,
  direccion: string,
): Promise<EstadoEdicion> {
  const tipoValido = tipo === "fotos" || esTipoLista(tipo);
  if (!tipoValido || !esquemaId.safeParse(id).success) {
    return { estado: "error", mensaje: ERROR_INTERNO };
  }
  if (direccion !== "arriba" && direccion !== "abajo") {
    return { estado: "error", mensaje: ERROR_INTERNO };
  }
  return ejecutar(
    "cambiar el orden",
    () => moverElementoLista(tipo as Parameters<typeof moverElementoLista>[0], id, direccion),
    "Orden actualizado.",
  );
}

// -----------------------------------------------------------------------------
// Fotos (el navegador ya las redujo a 1600 px y las convirtió a WebP)
// -----------------------------------------------------------------------------

function validarArchivo(formData: FormData): Blob | string {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof Blob) || archivo.size === 0) return "Elige una foto.";
  if (archivo.size > TAMANO_MAXIMO_FOTO) return "La foto pesa más de 3 MB. Prueba con otra.";
  return archivo;
}

async function subirFoto(
  destino: "galeria" | "portada",
  formData: FormData,
): Promise<EstadoEdicion> {
  const archivo = validarArchivo(formData);
  if (typeof archivo === "string") {
    return { estado: "error", mensaje: archivo, errores: { archivo } };
  }
  const datos = esquemaDatosFoto.safeParse(textos(formData));
  if (!datos.success) {
    return { estado: "error", mensaje: REVISAR, errores: erroresPorCampo<string>(datos.error) };
  }

  try {
    const resultado =
      destino === "galeria"
        ? await agregarFotoGaleria(archivo, datos.data)
        : await cambiarFotoPortada(archivo, datos.data);
    if (resultado.ok) return { estado: "exito", mensaje: "Foto guardada." };
    return resultado.motivo === "formato"
      ? {
          estado: "error",
          mensaje: "El archivo no es una imagen válida (JPG, PNG o WebP).",
          errores: { archivo: "El archivo no es una imagen válida." },
        }
      : { estado: "error", mensaje: SIN_PERMISO };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[sitio] Error al subir una foto:", (error as Error).message);
    return { estado: "error", mensaje: "No pudimos subir la foto. Inténtalo en unos minutos." };
  }
}

export async function subirFotoGaleria(
  _estadoAnterior: EstadoEdicion,
  formData: FormData,
): Promise<EstadoEdicion> {
  return subirFoto("galeria", formData);
}

export async function subirFotoPortada(
  _estadoAnterior: EstadoEdicion,
  formData: FormData,
): Promise<EstadoEdicion> {
  return subirFoto("portada", formData);
}

export async function guardarTextoFoto(
  _estadoAnterior: EstadoEdicion,
  formData: FormData,
): Promise<EstadoEdicion> {
  const validacion = esquemaTextoFoto.safeParse(textos(formData));
  if (!validacion.success) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: erroresPorCampo<string>(validacion.error),
    };
  }
  return ejecutar("actualizar la descripción de la foto", () =>
    cambiarTextoFoto(validacion.data.id, validacion.data.alt),
  );
}

export async function guardarTextoPortada(
  _estadoAnterior: EstadoEdicion,
  formData: FormData,
): Promise<EstadoEdicion> {
  const alt = (formData.get("alt") ?? "").toString().trim();
  if (!alt || alt.length > 200) {
    return {
      estado: "error",
      mensaje: REVISAR,
      errores: { alt: "Describe brevemente la foto (hasta 200 caracteres)." },
    };
  }
  return ejecutar("actualizar la descripción de la portada", () => cambiarTextoPortada(alt));
}

export async function eliminarFoto(id: string): Promise<EstadoEdicion> {
  if (!esquemaId.safeParse(id).success) return { estado: "error", mensaje: ERROR_INTERNO };
  return ejecutar("eliminar una foto", () => quitarFotoGaleria(id), "Foto eliminada.");
}

export async function eliminarFotoPortada(): Promise<EstadoEdicion> {
  return ejecutar("quitar la foto de portada", () => quitarFotoPortada(), "Foto quitada.");
}
