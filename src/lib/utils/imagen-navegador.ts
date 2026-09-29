/**
 * Preparación de fotos EN EL NAVEGADOR antes de subirlas desde el panel:
 * - Reduce el lado mayor a 1600 px: una foto de celular (4–12 MB) queda en ~200–500 KB,
 *   carga rápido en el sitio y cabe en el límite de las Server Actions.
 * - Re-codifica la imagen, lo que elimina los metadatos EXIF (que en fotos de celular
 *   suelen incluir la ubicación GPS donde se tomó).
 * - Respeta la orientación de la cámara (fotos verticales no quedan giradas).
 */
export type ImagenPreparada = { archivo: Blob; ancho: number; alto: number };

const LADO_MAXIMO = 1600;

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob | null> {
  return new Promise((resolver) => canvas.toBlob(resolver, tipo, calidad));
}

export async function prepararImagen(original: File): Promise<ImagenPreparada> {
  const bitmap = await createImageBitmap(original, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.max(1, Math.round(bitmap.width * escala));
  const alto = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("El navegador no permite procesar imágenes.");
  contexto.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  // WebP (más liviano); si el navegador no sabe generarlo, JPEG.
  let archivo = await aBlob(canvas, "image/webp", 0.82);
  if (!archivo || archivo.type !== "image/webp") archivo = await aBlob(canvas, "image/jpeg", 0.85);
  if (!archivo) throw new Error("No se pudo procesar la imagen.");

  return { archivo, ancho, alto };
}
