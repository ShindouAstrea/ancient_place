import { Quote } from "lucide-react";

import { siteConfig, type Testimonio } from "@/config/site";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";

/** Solo se muestra si hay testimonios en site.ts (deben ser reales y autorizados). */
export function Testimonios() {
  const { testimonios } = siteConfig;
  const lista: readonly Testimonio[] = testimonios.lista;
  if (lista.length === 0) return null;

  return (
    <Seccion id="testimonios" titulo={testimonios.titulo}>
      <ul className="grid gap-5 md:grid-cols-2">
        {lista.map((t) => (
          <li key={t.texto}>
            <Tarjeta className="h-full">
              <figure className="flex h-full flex-col">
                <Quote className="mb-3 size-8 text-terracota" aria-hidden="true" />
                <blockquote className="flex-1 text-lg italic">{t.texto}</blockquote>
                <figcaption className="mt-4 text-base">
                  <span className="font-semibold">{t.autor}</span>
                  <span className="text-tinta-suave">, {t.relacion}</span>
                </figcaption>
              </figure>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}
