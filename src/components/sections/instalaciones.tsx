import Image from "next/image";

import { siteConfig } from "@/config/site";
import { Seccion } from "@/components/ui/seccion";
import { urlFoto } from "@/lib/utils/fotos";
import type { Foto } from "@/types/contenido";

export function Instalaciones({ fotos, introduccion }: { fotos: Foto[]; introduccion: string }) {
  return (
    <Seccion
      id="instalaciones"
      titulo={siteConfig.titulos.instalaciones}
      introduccion={introduccion || undefined}
    >
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fotos.map((foto) => (
          <li key={foto.id} className="overflow-hidden rounded-2xl bg-salvia-100 shadow-sm">
            {/* Carga diferida (por defecto en next/image): no afecta la carga inicial. */}
            <Image
              src={urlFoto(foto.ruta)}
              alt={foto.alt}
              width={foto.ancho}
              height={foto.alto}
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
              className="aspect-[4/3] h-auto w-full object-cover"
            />
          </li>
        ))}
      </ul>
    </Seccion>
  );
}
