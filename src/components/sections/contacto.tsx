import { Mail, Phone } from "lucide-react";

import { siteConfig } from "@/config/site";
import { BotonEnlace } from "@/components/ui/boton";
import { IconoWhatsapp } from "@/components/ui/icono-whatsapp";
import { Seccion } from "@/components/ui/seccion";
import { Tarjeta } from "@/components/ui/tarjeta";
import { enlaceTelefono, enlaceWhatsapp } from "@/lib/utils/contacto";

import { FormularioContacto } from "./formulario-contacto";

export function Contacto() {
  const { contactoSeccion, contacto } = siteConfig;
  return (
    <Seccion
      id="contacto"
      titulo={contactoSeccion.titulo}
      introduccion={contactoSeccion.introduccion}
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <Tarjeta>
          <FormularioContacto parentescos={contactoSeccion.parentescos} />
        </Tarjeta>

        <aside aria-label="Otras formas de contacto" className="flex flex-col gap-4">
          <Tarjeta className="flex flex-col gap-4 bg-salvia-50">
            <h3 className="text-xl font-semibold">¿Prefieres hablar ahora?</h3>
            <BotonEnlace
              href={enlaceWhatsapp(contacto.whatsapp, contacto.mensajeWhatsappPorDefecto)}
              externo
              variante="whatsapp"
            >
              <IconoWhatsapp className="size-5" />
              WhatsApp
            </BotonEnlace>
            <BotonEnlace href={enlaceTelefono(contacto.telefono)} variante="secundario">
              <Phone className="size-5" aria-hidden="true" />
              Llamar
            </BotonEnlace>
            <a
              href={`mailto:${contacto.email}`}
              className="flex min-h-11 items-center justify-center gap-2 text-base font-semibold break-all text-salvia-800 underline"
            >
              <Mail className="size-5 shrink-0" aria-hidden="true" />
              {contacto.email}
            </a>
          </Tarjeta>
        </aside>
      </div>
    </Seccion>
  );
}
