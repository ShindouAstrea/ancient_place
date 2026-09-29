import Image from "next/image";

import { siteConfig } from "@/config/site";
import { BotonEnlace } from "@/components/ui/boton";
import { IconoWhatsapp } from "@/components/ui/icono-whatsapp";
import { Contenedor } from "@/components/ui/seccion";
import { enlaceWhatsapp } from "@/lib/utils/contacto";
import { urlFoto } from "@/lib/utils/fotos";
import type { ConfiguracionSitio } from "@/types/contenido";

export function Hero({ config }: { config: ConfiguracionSitio }) {
  const tieneFoto = Boolean(config.hero_foto && config.hero_foto_ancho && config.hero_foto_alto);

  return (
    <section aria-labelledby="hero-titulo" className="bg-salvia-50 py-12 sm:py-20">
      <Contenedor
        className={tieneFoto ? "grid items-center gap-10 lg:grid-cols-2 lg:gap-16" : "max-w-3xl"}
      >
        <div>
          <h1
            id="hero-titulo"
            className="text-4xl leading-tight font-semibold sm:text-5xl lg:text-[3.4rem]"
          >
            {config.hero_titulo || config.nombre}
          </h1>
          {config.hero_subtitulo ? (
            <p className="mt-6 text-xl text-tinta-suave">{config.hero_subtitulo}</p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-w-md lg:flex-col">
            {config.whatsapp ? (
              <BotonEnlace
                href={enlaceWhatsapp(config.whatsapp, config.mensaje_whatsapp)}
                externo
                variante="whatsapp"
                tamano="grande"
              >
                <IconoWhatsapp className="size-6" />
                {siteConfig.hero.textoWhatsapp}
              </BotonEnlace>
            ) : null}
            <BotonEnlace
              href="#contacto"
              variante={config.whatsapp ? "secundario" : "primario"}
              tamano="grande"
            >
              {siteConfig.hero.textoFormulario}
            </BotonEnlace>
          </div>
        </div>

        {tieneFoto ? (
          <div className="overflow-hidden rounded-3xl shadow-md">
            {/* Imagen principal: preload porque suele ser el elemento LCP de la página. */}
            <Image
              src={urlFoto(config.hero_foto!)}
              alt={config.hero_foto_alt}
              width={config.hero_foto_ancho!}
              height={config.hero_foto_alto!}
              preload
              sizes="(min-width: 1024px) 540px, 100vw"
              className="h-auto w-full"
            />
          </div>
        ) : null}
      </Contenedor>
    </section>
  );
}
