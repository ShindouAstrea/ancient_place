import { siteConfig } from "@/config/site";
import { Icono } from "@/components/ui/icono";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";

export function Servicios() {
  const { servicios } = siteConfig;
  return (
    <Seccion id="servicios" titulo={servicios.titulo} introduccion={servicios.introduccion} alterna>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {servicios.lista.map((servicio) => (
          <li key={servicio.titulo}>
            <Tarjeta className="h-full">
              <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-salvia-100 text-salvia-700">
                <Icono nombre={servicio.icono} className="size-7" />
              </span>
              <h3 className="text-xl font-semibold">{servicio.titulo}</h3>
              <p className="mt-2 text-tinta-suave">{servicio.descripcion}</p>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}
