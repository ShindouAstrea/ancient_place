import { envPublico } from "@/lib/env";

/** URL pública de una foto guardada en el bucket "sitio" de Supabase Storage. */
export function urlFoto(ruta: string): string {
  return `${envPublico.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sitio/${ruta}`;
}
