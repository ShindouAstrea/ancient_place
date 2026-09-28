import Image from "next/image";

import { siteConfig } from "@/config/site";
import { BotonEnlace } from "@/components/ui/boton";
import { IconoWhatsapp } from "@/components/ui/icono-whatsapp";
import { Contenedor } from "@/components/ui/seccion";
import { enlaceWhatsapp } from "@/lib/utils/contacto";

export function Hero() {
  const { hero, contacto } = siteConfig;
  return (
    <section aria-labelledby="hero-titulo" className="bg-salvia-50 py-12 sm:py-20">
      <Contenedor className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h1
            id="hero-titulo"
            className="text-4xl leading-tight font-semibold sm:text-5xl lg:text-[3.4rem]"
          >
            {hero.titulo}
          </h1>
          <p className="mt-6 text-xl text-tinta-suave">{hero.subtitulo}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-w-md lg:flex-col">
            <BotonEnlace
              href={enlaceWhatsapp(contacto.whatsapp, contacto.mensajeWhatsappPorDefecto)}
              externo
              variante="whatsapp"
              tamano="grande"
            >
              <IconoWhatsapp className="size-6" />
              {hero.textoWhatsapp}
            </BotonEnlace>
            <BotonEnlace href="#contacto" variante="secundario" tamano="grande">
              {hero.textoFormulario}
            </BotonEnlace>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl shadow-md">
          {/* Imagen principal: preload porque suele ser el elemento LCP de la página. */}
          <Image
            src={hero.imagen.src}
            alt={hero.imagen.alt}
            width={hero.imagen.ancho}
            height={hero.imagen.alto}
            preload
            sizes="(min-width: 1024px) 540px, 100vw"
            className="h-auto w-full"
          />
        </div>
      </Contenedor>
    </section>
  );
}
