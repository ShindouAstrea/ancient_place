import { siteConfig } from "@/config/site";
import { Icono } from "@/components/ui/icono";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";
import type { Servicio } from "@/types/contenido";

export function Servicios({
  servicios,
  introduccion,
}: {
  servicios: Servicio[];
  introduccion: string;
}) {
  return (
    <Seccion
      id="servicios"
      titulo={siteConfig.titulos.servicios}
      introduccion={introduccion || undefined}
      alterna
    >
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {servicios.map((servicio) => (
          <li key={servicio.id}>
            <Tarjeta className="h-full">
              <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-salvia-100 text-salvia-700">
                <Icono nombre={servicio.icono} className="size-7" />
              </span>
              <h3 className="text-xl font-semibold">{servicio.titulo}</h3>
              {servicio.descripcion ? (
                <p className="mt-2 text-tinta-suave">{servicio.descripcion}</p>
              ) : null}
            </Tarjeta>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}
