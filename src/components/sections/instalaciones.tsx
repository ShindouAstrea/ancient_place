import Image from "next/image";

import { siteConfig } from "@/config/site";
import { Seccion } from "@/components/ui/seccion";

export function Instalaciones() {
  const { instalaciones } = siteConfig;
  return (
    <Seccion
      id="instalaciones"
      titulo={instalaciones.titulo}
      introduccion={instalaciones.introduccion}
    >
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {instalaciones.fotos.map((foto) => (
          <li key={foto.src} className="overflow-hidden rounded-2xl bg-salvia-100 shadow-sm">
            {/* Carga diferida (por defecto en next/image): no afecta la carga inicial. */}
            <Image
              src={foto.src}
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
