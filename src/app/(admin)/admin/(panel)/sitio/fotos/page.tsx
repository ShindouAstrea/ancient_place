import type { Metadata } from "next";

import { FotoPortada, GaleriaFotos } from "@/components/admin/sitio/gestor-fotos";
import { VolverSitio } from "@/components/admin/sitio/volver-sitio";
import { Tarjeta } from "@/components/ui/tarjeta";
import { requerirRol } from "@/server/services/auth";
import { obtenerContenidoSitio } from "@/server/services/contenido";

export const metadata: Metadata = { title: "Fotos" };

export default async function FotosPage() {
  await requerirRol("sitio");
  const { config, fotos } = await obtenerContenidoSitio();

  return (
    <div className="space-y-8">
      <div>
        <VolverSitio />
        <h1 className="text-3xl font-semibold">Fotos</h1>
        <p className="mt-1 text-tinta-suave">
          Las fotos se achican automáticamente antes de subirse y se les quita la ubicación GPS que
          guardan los celulares.
        </p>
      </div>

      <section aria-labelledby="titulo-portada">
        <Tarjeta>
          <h2 id="titulo-portada" className="mb-4 text-2xl font-semibold">
            Foto de portada
          </h2>
          <FotoPortada
            ruta={config.hero_foto}
            alt={config.hero_foto_alt}
            ancho={config.hero_foto_ancho}
            alto={config.hero_foto_alto}
          />
        </Tarjeta>
      </section>

      <section aria-labelledby="titulo-galeria">
        <h2 id="titulo-galeria" className="mb-4 text-2xl font-semibold">
          Galería «Nuestras instalaciones»
        </h2>
        <GaleriaFotos fotos={fotos} />
      </section>
    </div>
  );
}
