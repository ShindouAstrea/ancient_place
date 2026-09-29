import { Contacto } from "@/components/sections/contacto";
import { Hero } from "@/components/sections/hero";
import { Instalaciones } from "@/components/sections/instalaciones";
import { Nosotros, tieneNosotros } from "@/components/sections/nosotros";
import { PorQueElegirnos } from "@/components/sections/por-que-elegirnos";
import { PreguntasFrecuentes } from "@/components/sections/preguntas-frecuentes";
import { Servicios } from "@/components/sections/servicios";
import { Testimonios } from "@/components/sections/testimonios";
import { tieneUbicacion, Ubicacion } from "@/components/sections/ubicacion";
import { obtenerContenidoSitio } from "@/server/services/contenido";

/** Landing. Las secciones sin contenido (ej: sin fotos o sin testimonios) no se muestran. */
export default async function InicioPage() {
  const { config, servicios, razones, testimonios, preguntas, fotos } =
    await obtenerContenidoSitio();

  return (
    <>
      <Hero config={config} />
      {tieneNosotros(config) ? <Nosotros config={config} /> : null}
      {servicios.length > 0 ? (
        <Servicios servicios={servicios} introduccion={config.servicios_intro} />
      ) : null}
      {fotos.length > 0 ? (
        <Instalaciones fotos={fotos} introduccion={config.instalaciones_intro} />
      ) : null}
      {razones.length > 0 ? <PorQueElegirnos razones={razones} /> : null}
      {testimonios.length > 0 ? <Testimonios testimonios={testimonios} /> : null}
      {preguntas.length > 0 ? <PreguntasFrecuentes preguntas={preguntas} /> : null}
      <Contacto config={config} />
      {tieneUbicacion(config) ? <Ubicacion config={config} /> : null}
    </>
  );
}
