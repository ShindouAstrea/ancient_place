import { Clock, MapPin, Navigation } from "lucide-react";

import { siteConfig } from "@/config/site";
import { BotonEnlace } from "@/components/ui/boton";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";
import { describirDias } from "@/lib/utils/horario";
import type { ConfiguracionSitio } from "@/types/contenido";

/** Hay horario si hay tramos (días y horas) o una aclaración en texto libre. */
export function tieneHorario(config: ConfiguracionSitio) {
  return config.horario_tramos.length > 0 || Boolean(config.horario_visitas);
}

/** La sección se muestra si hay dirección, horario o mapa. */
export function tieneUbicacion(config: ConfiguracionSitio) {
  return Boolean(config.direccion || tieneHorario(config) || config.maps_embed_url);
}

/** Tramos ("Lunes a viernes, de 10:00 a 18:00"), uno por línea, y luego la aclaración. */
export function HorarioVisitas({ config }: { config: ConfiguracionSitio }) {
  return (
    <>
      {config.horario_tramos.length > 0 ? (
        <ul>
          {/* El rango de horas nunca se parte entre dos líneas. */}
          {config.horario_tramos.map((tramo, i) => (
            <li key={i}>
              {describirDias(tramo.dias)},{" "}
              <span className="whitespace-nowrap">
                de {tramo.desde} a {tramo.hasta}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {config.horario_visitas ? (
        <p className="whitespace-pre-line">{config.horario_visitas}</p>
      ) : null}
    </>
  );
}

/** Dirección en una línea: "Av. Ejemplo 123, Santiago, Región Metropolitana". */
export function direccionCompleta(config: ConfiguracionSitio) {
  return [config.direccion, config.ciudad, config.region].filter(Boolean).join(", ");
}

export function Ubicacion({ config }: { config: ConfiguracionSitio }) {
  const direccion = direccionCompleta(config);

  return (
    <Seccion id="ubicacion" titulo={siteConfig.titulos.ubicacion} alterna>
      <div
        className={
          config.maps_embed_url ? "grid gap-8 lg:grid-cols-[20rem_1fr]" : "mx-auto max-w-xl"
        }
      >
        <Tarjeta className="flex flex-col gap-6">
          {direccion ? (
            <div className="flex gap-3">
              <MapPin className="mt-1 size-6 shrink-0 text-salvia-700" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold">Dirección</h3>
                <address className="text-tinta-suave not-italic">{direccion}</address>
              </div>
            </div>
          ) : null}
          {tieneHorario(config) ? (
            <div className="flex gap-3">
              <Clock className="mt-1 size-6 shrink-0 text-salvia-700" aria-hidden="true" />
              <div className="space-y-1 text-tinta-suave">
                <h3 className="text-lg font-semibold text-tinta">Horario de visitas</h3>
                <HorarioVisitas config={config} />
              </div>
            </div>
          ) : null}
          {config.maps_url ? (
            <BotonEnlace href={config.maps_url} externo variante="secundario">
              <Navigation className="size-5" aria-hidden="true" />
              Cómo llegar
            </BotonEnlace>
          ) : null}
        </Tarjeta>

        {config.maps_embed_url ? (
          <div className="min-h-80 overflow-hidden rounded-2xl border border-salvia-200 bg-salvia-100">
            {/* loading="lazy": el mapa (pesado) solo se carga al acercarse a la sección. */}
            <iframe
              src={config.maps_embed_url}
              title={`Mapa de ubicación de ${config.nombre}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full min-h-80 w-full border-0"
            />
          </div>
        ) : null}
      </div>
    </Seccion>
  );
}
