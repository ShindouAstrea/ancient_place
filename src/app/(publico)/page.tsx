import { Contacto } from "@/components/sections/contacto";
import { Hero } from "@/components/sections/hero";
import { Instalaciones } from "@/components/sections/instalaciones";
import { Nosotros } from "@/components/sections/nosotros";
import { PorQueElegirnos } from "@/components/sections/por-que-elegirnos";
import { PreguntasFrecuentes } from "@/components/sections/preguntas-frecuentes";
import { Servicios } from "@/components/sections/servicios";
import { Testimonios } from "@/components/sections/testimonios";
import { Ubicacion } from "@/components/sections/ubicacion";

export default function InicioPage() {
  return (
    <>
      <Hero />
      <Nosotros />
      <Servicios />
      <Instalaciones />
      <PorQueElegirnos />
      <Testimonios />
      <PreguntasFrecuentes />
      <Contacto />
      <Ubicacion />
    </>
  );
}
