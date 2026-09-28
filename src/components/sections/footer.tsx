import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { IconoWhatsapp } from "@/components/ui/icono-whatsapp";
import { Contenedor } from "@/components/ui/seccion";
import { enlaceTelefono, enlaceWhatsapp } from "@/lib/utils/contacto";

const claseEnlace = "inline-flex min-h-11 items-center gap-3 hover:text-white hover:underline";

export function Footer() {
  const { contacto, ubicacion } = siteConfig;
  const anio = new Date().getFullYear();

  return (
    // pb extra en móvil para que el botón flotante de WhatsApp no tape el contenido.
    <footer className="bg-tinta pt-14 pb-28 text-salvia-200 sm:pb-14">
      <Contenedor className="grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-serif text-2xl font-semibold text-white">{siteConfig.nombre}</p>
          <p className="mt-3 text-base">{siteConfig.descripcionCorta}</p>
        </div>

        <div>
          <h2 className="font-sans text-lg font-bold text-white">Contacto</h2>
          <ul className="mt-3 text-base">
            <li>
              <a
                href={enlaceWhatsapp(contacto.whatsapp, contacto.mensajeWhatsappPorDefecto)}
                target="_blank"
                rel="noopener noreferrer"
                className={claseEnlace}
              >
                <IconoWhatsapp className="size-5 shrink-0" />
                WhatsApp
              </a>
            </li>
            <li>
              <a href={enlaceTelefono(contacto.telefono)} className={claseEnlace}>
                <Phone className="size-5 shrink-0" aria-hidden="true" />
                {contacto.telefono}
              </a>
            </li>
            <li>
              <a href={`mailto:${contacto.email}`} className={`${claseEnlace} break-all`}>
                <Mail className="size-5 shrink-0" aria-hidden="true" />
                {contacto.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-lg font-bold text-white">Visítanos</h2>
          <ul className="mt-3 space-y-3 text-base">
            <li className="flex gap-3">
              <MapPin className="mt-1 size-5 shrink-0" aria-hidden="true" />
              <address className="not-italic">
                {ubicacion.direccion}, {ubicacion.ciudad}, {ubicacion.region}
              </address>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-1 size-5 shrink-0" aria-hidden="true" />
              <span>{siteConfig.horarioVisitas}</span>
            </li>
          </ul>
        </div>
      </Contenedor>

      <Contenedor className="mt-10 flex flex-col gap-2 border-t border-salvia-900 pt-6 text-base sm:flex-row sm:justify-between">
        <p>
          © {anio} {siteConfig.nombre}
        </p>
        <Link
          href="/privacidad"
          className="inline-flex min-h-11 items-center underline hover:text-white"
        >
          Política de privacidad
        </Link>
      </Contenedor>
    </footer>
  );
}
