import { Mail, Phone } from "lucide-react";

import { siteConfig } from "@/config/site";
import { BotonEnlace } from "@/components/ui/boton";
import { IconoWhatsapp } from "@/components/ui/icono-whatsapp";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";
import { enlaceTelefono, enlaceWhatsapp } from "@/lib/utils/contacto";
import type { ConfiguracionSitio } from "@/types/contenido";

import { FormularioContacto } from "./formulario-contacto";

export function Contacto({ config }: { config: ConfiguracionSitio }) {
  const whatsapp = config.whatsapp
    ? enlaceWhatsapp(config.whatsapp, config.mensaje_whatsapp)
    : null;
  const hayOtrasFormas = Boolean(whatsapp || config.telefono || config.email_contacto);

  return (
    <Seccion
      id="contacto"
      titulo={siteConfig.titulos.contacto}
      introduccion={siteConfig.contacto.introduccion}
    >
      <div className={hayOtrasFormas ? "grid gap-8 lg:grid-cols-[1fr_20rem]" : "mx-auto max-w-3xl"}>
        <Tarjeta>
          <FormularioContacto
            parentescos={siteConfig.contacto.parentescos}
            enlaceWhatsappHogar={whatsapp}
          />
        </Tarjeta>

        {hayOtrasFormas ? (
          <aside aria-label="Otras formas de contacto" className="flex flex-col gap-4">
            <Tarjeta className="flex flex-col gap-4 bg-salvia-50">
              <h3 className="text-xl font-semibold">¿Prefieres hablar ahora?</h3>
              {whatsapp ? (
                <BotonEnlace href={whatsapp} externo variante="whatsapp">
                  <IconoWhatsapp className="size-5" />
                  WhatsApp
                </BotonEnlace>
              ) : null}
              {config.telefono ? (
                <BotonEnlace href={enlaceTelefono(config.telefono)} variante="secundario">
                  <Phone className="size-5" aria-hidden="true" />
                  Llamar
                </BotonEnlace>
              ) : null}
              {config.email_contacto ? (
                <a
                  href={`mailto:${config.email_contacto}`}
                  className="flex min-h-11 items-center justify-center gap-2 text-base font-semibold break-all text-salvia-800 underline"
                >
                  <Mail className="size-5 shrink-0" aria-hidden="true" />
                  {config.email_contacto}
                </a>
              ) : null}
            </Tarjeta>
          </aside>
        ) : null}
      </div>
    </Seccion>
  );
}
