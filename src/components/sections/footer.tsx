import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

import { IconoWhatsapp } from "@/components/ui/icono-whatsapp";
import { Contenedor } from "@/components/ui/seccion";
import { enlaceTelefono, enlaceWhatsapp, formatearTelefono } from "@/lib/utils/contacto";
import type { ConfiguracionSitio } from "@/types/contenido";

import { HorarioVisitas, direccionCompleta, tieneHorario } from "./ubicacion";

const claseEnlace = "inline-flex min-h-11 items-center gap-3 hover:text-white hover:underline";

export function Footer({ config }: { config: ConfiguracionSitio }) {
  const anio = new Date().getFullYear();
  const direccion = direccionCompleta(config);
  const hayContacto = Boolean(config.whatsapp || config.telefono || config.email_contacto);

  return (
    // pb extra en móvil para que el botón flotante de WhatsApp no tape el contenido.
    <footer className="bg-tinta pt-14 pb-28 text-salvia-200 sm:pb-14">
      <Contenedor className="grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-serif text-2xl font-semibold text-white">{config.nombre}</p>
          {config.descripcion_corta ? (
            <p className="mt-3 text-base">{config.descripcion_corta}</p>
          ) : null}
        </div>

        {hayContacto ? (
          <div>
            <h2 className="font-sans text-lg font-bold text-white">Contacto</h2>
            <ul className="mt-3 text-base">
              {config.whatsapp ? (
                <li>
                  <a
                    href={enlaceWhatsapp(config.whatsapp, config.mensaje_whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={claseEnlace}
                  >
                    <IconoWhatsapp className="size-5 shrink-0" />
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {config.telefono ? (
                <li>
                  <a href={enlaceTelefono(config.telefono)} className={claseEnlace}>
                    <Phone className="size-5 shrink-0" aria-hidden="true" />
                    {formatearTelefono(config.telefono)}
                  </a>
                </li>
              ) : null}
              {config.email_contacto ? (
                <li>
                  <a
                    href={`mailto:${config.email_contacto}`}
                    className={`${claseEnlace} break-all`}
                  >
                    <Mail className="size-5 shrink-0" aria-hidden="true" />
                    {config.email_contacto}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {direccion || tieneHorario(config) ? (
          <div>
            <h2 className="font-sans text-lg font-bold text-white">Visítanos</h2>
            <ul className="mt-3 space-y-3 text-base">
              {direccion ? (
                <li className="flex gap-3">
                  <MapPin className="mt-1 size-5 shrink-0" aria-hidden="true" />
                  <address className="not-italic">{direccion}</address>
                </li>
              ) : null}
              {tieneHorario(config) ? (
                <li className="flex gap-3">
                  <Clock className="mt-1 size-5 shrink-0" aria-hidden="true" />
                  <div>
                    <span className="sr-only">Horario de visitas: </span>
                    <HorarioVisitas config={config} />
                  </div>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </Contenedor>

      <Contenedor className="mt-10 flex flex-col gap-2 border-t border-salvia-900 pt-6 text-base sm:flex-row sm:justify-between">
        <p>
          © {anio} {config.nombre}
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
