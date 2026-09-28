import { siteConfig } from "@/config/site";
import { Seccion } from "@/components/ui/seccion";

export function Nosotros() {
  const { nosotros } = siteConfig;
  return (
    <Seccion id="nosotros" titulo={nosotros.titulo}>
      <div className="mx-auto max-w-3xl space-y-5 text-center">
        {nosotros.parrafos.map((parrafo) => (
          <p key={parrafo}>{parrafo}</p>
        ))}
      </div>

      <dl className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
        {nosotros.destacados.map((dato) => (
          <div
            key={dato.etiqueta}
            className="flex flex-col-reverse items-center rounded-2xl bg-salvia-100 px-4 py-6 text-center"
          >
            <dt className="text-base text-tinta-suave">{dato.etiqueta}</dt>
            <dd className="font-serif text-4xl font-semibold text-salvia-800">{dato.valor}</dd>
          </div>
        ))}
      </dl>
    </Seccion>
  );
}
