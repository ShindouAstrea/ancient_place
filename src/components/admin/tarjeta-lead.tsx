import { Mail, Phone } from "lucide-react";

import { siteConfig } from "@/config/site";
import { BotonEnlace } from "@/components/ui/boton";
import { IconoWhatsapp } from "@/components/ui/icono-whatsapp";
import { cn } from "@/lib/utils/cn";
import {
  enlaceTelefono,
  enlaceWhatsapp,
  esCelularChileno,
  formatearTelefono,
  mensajeRespuestaWhatsapp,
} from "@/lib/utils/contacto";
import { formatearFechaHora, tiempoRelativo } from "@/lib/utils/fechas";
import type { LeadPanel } from "@/server/services/leads";

import { InsigniaEstado } from "./insignia-estado";
import { SelectorEstado } from "./selector-estado";

/**
 * Tarjeta de un contacto, pensada para el celular: datos legibles, acciones grandes
 * (llamar, WhatsApp, correo) y cambio de estado al alcance del pulgar.
 */
export function TarjetaLead({ lead, ahora }: { lead: LeadPanel; ahora: Date }) {
  const idTitulo = `lead-${lead.id}`;
  const celular = esCelularChileno(lead.telefono);
  const asuntoCorreo = encodeURIComponent(`Tu solicitud de información - ${siteConfig.nombre}`);

  return (
    <article
      aria-labelledby={idTitulo}
      className={cn(
        "rounded-2xl border border-salvia-200 bg-white p-4 shadow-sm sm:p-6",
        // Los contactos nuevos se destacan con un borde cálido a la izquierda.
        lead.estado === "nuevo" && "border-l-4 border-l-terracota",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div>
          <h2 id={idTitulo} className="text-xl font-semibold">
            {lead.nombre}
          </h2>
          <p className="text-base text-tinta-suave">
            <time dateTime={lead.created_at}>{tiempoRelativo(lead.created_at, ahora)}</time>
            {" · "}
            {formatearFechaHora(lead.created_at)}
          </p>
        </div>
        <InsigniaEstado estado={lead.estado} />
      </header>

      {lead.parentesco ? (
        <p className="mt-2 text-base">
          Parentesco: <span className="font-semibold">{lead.parentesco}</span>
        </p>
      ) : null}

      <p className="mt-3 rounded-xl bg-salvia-50 p-3 [overflow-wrap:anywhere] whitespace-pre-wrap">
        {lead.mensaje}
      </p>

      <dl className="mt-3 space-y-1 text-base">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-tinta-suave">Teléfono:</dt>
          <dd className="font-semibold">{formatearTelefono(lead.telefono)}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-tinta-suave">Correo:</dt>
          <dd className="font-semibold break-all">{lead.email}</dd>
        </div>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <BotonEnlace href={enlaceTelefono(lead.telefono)}>
          <Phone className="size-5" aria-hidden="true" />
          Llamar
          <span className="sr-only"> a {lead.nombre}</span>
        </BotonEnlace>
        {celular ? (
          <BotonEnlace
            href={enlaceWhatsapp(lead.telefono, mensajeRespuestaWhatsapp(lead.nombre))}
            externo
            variante="whatsapp"
          >
            <IconoWhatsapp className="size-5" />
            WhatsApp
            <span className="sr-only"> a {lead.nombre} (se abre en una pestaña nueva)</span>
          </BotonEnlace>
        ) : null}
        <BotonEnlace
          href={`mailto:${lead.email}?subject=${asuntoCorreo}`}
          variante="secundario"
          className={cn(celular && "col-span-2")}
        >
          <Mail className="size-5" aria-hidden="true" />
          Correo
          <span className="sr-only"> a {lead.nombre}</span>
        </BotonEnlace>
      </div>

      <SelectorEstado id={lead.id} estado={lead.estado} nombre={lead.nombre} />

      <p className="text-base text-tinta-suave">
        Consentimiento otorgado el {formatearFechaHora(lead.fecha_consentimiento)}
      </p>
    </article>
  );
}
