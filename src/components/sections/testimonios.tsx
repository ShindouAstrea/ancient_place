import { Quote } from "lucide-react";

import { siteConfig } from "@/config/site";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";
import type { Testimonio } from "@/types/contenido";

/**
 * Testimonios. Deben ser reales y contar con autorización de quien los entrega:
 * inventarlos puede constituir publicidad engañosa (se recuerda en el panel).
 */
export function Testimonios({ testimonios }: { testimonios: Testimonio[] }) {
  return (
    <Seccion id="testimonios" titulo={siteConfig.titulos.testimonios}>
      <ul className="grid gap-5 md:grid-cols-2">
        {testimonios.map((t) => (
          <li key={t.id}>
            <Tarjeta className="h-full">
              <figure className="flex h-full flex-col">
                <Quote className="mb-3 size-8 text-terracota" aria-hidden="true" />
                <blockquote className="flex-1 text-lg whitespace-pre-line italic">
                  {t.texto}
                </blockquote>
                <figcaption className="mt-4 text-base">
                  <span className="font-semibold">{t.autor}</span>
                  {t.relacion ? <span className="text-tinta-suave">, {t.relacion}</span> : null}
                </figcaption>
              </figure>
            </Tarjeta>
          </li>
        ))}
      </ul>
    </Seccion>
  );
}
