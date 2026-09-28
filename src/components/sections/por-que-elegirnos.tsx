import { siteConfig } from "@/config/site";
import { Icono } from "@/components/ui/icono";
import { Seccion } from "@/components/ui/seccion";

export function PorQueElegirnos() {
  const { porQueElegirnos } = siteConfig;
  return (
    <Seccion id="por-que-elegirnos" titulo={porQueElegirnos.titulo} alterna>
      <ul className="grid gap-x-10 gap-y-8 md:grid-cols-2">
        {porQueElegirnos.razones.map((razon) => (
          <li key={razon.titulo} className="flex gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-salvia-700 text-white">
              <Icono nombre={razon.icono} className="size-6" />
            </span>
            <div>
              <h3 className="text-xl font-semibold">{razon.titulo}</h3>
              <p className="mt-1 text-tinta-suave">{razon.descripcion}</p>
            </div>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}
