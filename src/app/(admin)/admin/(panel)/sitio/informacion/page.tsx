import type { Metadata } from "next";

import { SECCIONES_INFORMACION } from "@/components/admin/sitio/definiciones";
import { FormularioSeccion } from "@/components/admin/sitio/formulario-seccion";
import { VolverSitio } from "@/components/admin/sitio/volver-sitio";
import { Tarjeta } from "@/components/ui/tarjeta";
import { guardarSeccion } from "@/server/actions/contenido";
import { requerirRol } from "@/server/services/auth";
import { obtenerContenidoSitio } from "@/server/services/contenido";
import type { ConfiguracionSitio } from "@/types/contenido";

export const metadata: Metadata = { title: "Información del hogar" };

/**
 * Valores actuales de los campos del formulario: los destacados se separan en 4 pares y
 * el horario por tramos viaja como JSON (lo lee el campo "horario").
 */
function valoresFormulario(config: ConfiguracionSitio): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(config)) {
    if (typeof valor === "string") valores[clave] = valor;
  }
  config.destacados.forEach((d, i) => {
    valores[`destacado_valor_${i + 1}`] = d.valor;
    valores[`destacado_etiqueta_${i + 1}`] = d.etiqueta;
  });
  valores.horario_tramos = JSON.stringify(config.horario_tramos);
  return valores;
}

export default async function InformacionPage() {
  await requerirRol("sitio");
  const { config } = await obtenerContenidoSitio();
  const valores = valoresFormulario(config);

  return (
    <div>
      <VolverSitio />
      <h1 className="text-3xl font-semibold">Información del hogar</h1>
      <p className="mt-1 text-tinta-suave">Cada sección se guarda por separado.</p>

      <nav aria-label="Secciones de esta página" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {SECCIONES_INFORMACION.map((s) => (
            <li key={s.clave}>
              <a
                href={`#seccion-${s.clave}`}
                className="inline-flex min-h-11 items-center rounded-full border-2 border-salvia-300 bg-white px-4 text-base font-semibold hover:bg-salvia-50"
              >
                {s.titulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-6">
        {SECCIONES_INFORMACION.map((seccion) => (
          <section
            key={seccion.clave}
            id={`seccion-${seccion.clave}`}
            aria-labelledby={`titulo-${seccion.clave}`}
            className="scroll-mt-24"
          >
            <Tarjeta>
              <h2 id={`titulo-${seccion.clave}`} className="text-2xl font-semibold">
                {seccion.titulo}
              </h2>
              {seccion.descripcion ? (
                <p className="mt-1 text-base text-tinta-suave">{seccion.descripcion}</p>
              ) : null}
              <div className="mt-5">
                <FormularioSeccion
                  accion={guardarSeccion.bind(null, seccion.clave)}
                  campos={seccion.campos}
                  valores={valores}
                  prefijo={seccion.clave}
                />
              </div>
            </Tarjeta>
          </section>
        ))}
      </div>
    </div>
  );
}
