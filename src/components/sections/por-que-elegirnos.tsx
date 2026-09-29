import { siteConfig } from "@/config/site";
import { Icono } from "@/components/ui/icono";
import { Seccion } from "@/components/ui/seccion";
import type { Razon } from "@/types/contenido";

export function PorQueElegirnos({ razones }: { razones: Razon[] }) {
  return (
    <Seccion id="por-que-elegirnos" titulo={siteConfig.titulos.porQueElegirnos} alterna>
      <ul className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {razones.map((razon) => (
          <li key={razon.id} className="flex gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-salvia-700 text-white">
              <Icono nombre={razon.icono} className="size-6" />
            </span>
            <div>
              <h3 className="text-xl font-semibold">{razon.titulo}</h3>
              {razon.descripcion ? (
                <p className="mt-1 text-tinta-suave">{razon.descripcion}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}
