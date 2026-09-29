import { siteConfig } from "@/config/site";
import { Seccion } from "@/components/ui/seccion";
import type { ConfiguracionSitio } from "@/types/contenido";

/** La sección se muestra si hay texto o datos destacados. */
export function tieneNosotros(config: ConfiguracionSitio) {
  return Boolean(config.nosotros_texto.trim()) || config.destacados.length > 0;
}

export function Nosotros({ config }: { config: ConfiguracionSitio }) {
  // Párrafos separados por una línea en blanco en el panel.
  const parrafos = config.nosotros_texto
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Seccion id="nosotros" titulo={siteConfig.titulos.nosotros}>
      {parrafos.length > 0 ? (
        <div className="mx-auto max-w-3xl space-y-5 text-center">
          {parrafos.map((parrafo) => (
            <p key={parrafo} className="whitespace-pre-line">
              {parrafo}
            </p>
          ))}
        </div>
      ) : null}

      {config.destacados.length > 0 ? (
        <dl
          className={
            "mx-auto mt-12 grid max-w-4xl gap-4 " +
            (config.destacados.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")
          }
        >
          {config.destacados.map((dato) => (
            <div
              key={`${dato.valor}-${dato.etiqueta}`}
              className="flex flex-col-reverse items-center rounded-2xl bg-salvia-100 px-4 py-6 text-center"
            >
              <dt className="text-base text-tinta-suave">{dato.etiqueta}</dt>
              <dd className="font-serif text-4xl font-semibold text-salvia-800">{dato.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Seccion>
  );
}
