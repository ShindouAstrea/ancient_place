import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TarjetaLead } from "@/components/admin/tarjeta-lead";
import { clasesBoton } from "@/components/ui/boton";
import { cn } from "@/lib/utils/cn";
import { obtenerPaginaLeads } from "@/server/services/leads";
import {
  ESTADOS_LEAD,
  ETIQUETAS_ESTADO,
  esquemaFiltroLeads,
  type EstadoLead,
} from "@/server/validators/leads";

export const metadata: Metadata = { title: "Contactos" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function urlListado(estado?: EstadoLead, pagina = 1) {
  const parametros = new URLSearchParams();
  if (estado) parametros.set("estado", estado);
  if (pagina > 1) parametros.set("pagina", String(pagina));
  const consulta = parametros.toString();
  return consulta ? `/admin/leads?${consulta}` : "/admin/leads";
}

function Filtro({
  href,
  activo,
  etiqueta,
  cantidad,
}: {
  href: string;
  activo: boolean;
  etiqueta: string;
  cantidad: number;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-base font-semibold whitespace-nowrap",
        activo
          ? "border-salvia-700 bg-salvia-700 text-white"
          : "border-salvia-300 bg-white text-tinta hover:bg-salvia-50",
      )}
    >
      {etiqueta}
      <span
        className={cn(
          "rounded-full px-2 text-base",
          activo ? "bg-white/20" : "bg-salvia-100 text-salvia-900",
        )}
      >
        {cantidad}
      </span>
    </Link>
  );
}

export default async function LeadsPage({ searchParams }: Props) {
  // Un filtro inválido en la URL se reemplaza por el valor por defecto (nunca falla).
  const filtro = esquemaFiltroLeads.parse(await searchParams);
  const { leads, conteo, pagina, totalPaginas } = await obtenerPaginaLeads(filtro);
  const ahora = new Date();

  return (
    <div>
      <h1 className="text-3xl font-semibold">Contactos</h1>

      <nav
        aria-label="Filtrar contactos por estado"
        className="-mx-4 mt-4 overflow-x-auto px-4 pb-2"
      >
        <ul className="flex gap-2">
          <li>
            <Filtro
              href={urlListado()}
              activo={!filtro.estado}
              etiqueta="Todos"
              cantidad={conteo.total}
            />
          </li>
          {ESTADOS_LEAD.map((estado) => (
            <li key={estado}>
              <Filtro
                href={urlListado(estado)}
                activo={filtro.estado === estado}
                etiqueta={ETIQUETAS_ESTADO[estado].plural}
                cantidad={conteo[estado]}
              />
            </li>
          ))}
        </ul>
      </nav>

      {leads.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-salvia-300 bg-white p-8 text-center">
          <Inbox className="size-10 text-salvia-700" aria-hidden="true" />
          <p className="text-lg font-semibold">
            {filtro.estado
              ? `No hay contactos ${ETIQUETAS_ESTADO[filtro.estado].plural.toLowerCase()}.`
              : "Todavía no hay contactos."}
          </p>
          {filtro.estado ? (
            <Link href={urlListado()} className={clasesBoton({ variante: "secundario" })}>
              Ver todos
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {leads.map((lead) => (
            <li key={lead.id}>
              <TarjetaLead lead={lead} ahora={ahora} />
            </li>
          ))}
        </ul>
      )}

      {totalPaginas > 1 ? (
        <nav
          aria-label="Páginas de contactos"
          className="mt-8 flex items-center justify-between gap-3"
        >
          {pagina > 1 ? (
            <Link
              href={urlListado(filtro.estado, pagina - 1)}
              className={clasesBoton({ variante: "secundario" })}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
              Más recientes
            </Link>
          ) : (
            <span />
          )}
          <p className="text-base text-tinta-suave">
            Página {pagina} de {totalPaginas}
          </p>
          {pagina < totalPaginas ? (
            <Link
              href={urlListado(filtro.estado, pagina + 1)}
              className={clasesBoton({ variante: "secundario" })}
            >
              Anteriores
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
