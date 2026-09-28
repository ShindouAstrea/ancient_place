import { ChevronDown } from "lucide-react";

import { siteConfig } from "@/config/site";
import { Seccion } from "@/components/ui/seccion";

/**
 * Acordeón con <details>/<summary> nativos: accesibles por teclado y lector de
 * pantalla sin JavaScript, y el contenido es indexable y buscable (Ctrl+F).
 */
export function PreguntasFrecuentes() {
  const { preguntasFrecuentes } = siteConfig;
  return (
    <Seccion id="preguntas" titulo={preguntasFrecuentes.titulo} alterna>
      <div className="mx-auto max-w-3xl space-y-3">
        {preguntasFrecuentes.lista.map((item) => (
          <details
            key={item.pregunta}
            className="group rounded-2xl border border-salvia-200 bg-white open:shadow-sm"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-lg font-semibold hover:bg-salvia-50 [&::-webkit-details-marker]:hidden">
              {item.pregunta}
              <ChevronDown
                className="size-6 shrink-0 text-salvia-700 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="px-5 pb-5 text-tinta-suave">{item.respuesta}</p>
          </details>
        ))}
      </div>
    </Seccion>
  );
}
