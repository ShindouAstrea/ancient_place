import { Clock, MapPin, Navigation } from "lucide-react";

import { esPendiente, siteConfig } from "@/config/site";
import { BotonEnlace } from "@/components/ui/boton";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";

export function Ubicacion() {
  const { ubicacion, horarioVisitas, ubicacionSeccion } = siteConfig;
  const mapaPendiente = esPendiente(ubicacion.googleMapsEmbedUrl);

  return (
    <Seccion id="ubicacion" titulo={ubicacionSeccion.titulo} alterna>
      <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        <Tarjeta className="flex flex-col gap-6">
          <div className="flex gap-3">
            <MapPin className="mt-1 size-6 shrink-0 text-salvia-700" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">Dirección</h3>
              <address className="text-tinta-suave not-italic">
                {ubicacion.direccion}
                <br />
                {ubicacion.ciudad}, {ubicacion.region}
              </address>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="mt-1 size-6 shrink-0 text-salvia-700" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold">Horario de visitas</h3>
              <p className="text-tinta-suave">{horarioVisitas}</p>
            </div>
          </div>
          <BotonEnlace href={ubicacion.googleMapsUrl} externo variante="secundario">
            <Navigation className="size-5" aria-hidden="true" />
            Cómo llegar
          </BotonEnlace>
        </Tarjeta>

        <div className="min-h-80 overflow-hidden rounded-2xl border border-salvia-200 bg-salvia-100">
          {mapaPendiente ? (
            <div className="flex h-full min-h-80 items-center justify-center p-6 text-center text-tinta-suave">
              [Mapa pendiente: agregar googleMapsEmbedUrl en site.ts]
            </div>
          ) : (
            // loading="lazy": el mapa (pesado) solo se carga al acercarse a la sección.
            <iframe
              src={ubicacion.googleMapsEmbedUrl}
              title={`Mapa de ubicación de ${siteConfig.nombre}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full min-h-80 w-full border-0"
            />
          )}
        </div>
      </div>
    </Seccion>
  );
}
