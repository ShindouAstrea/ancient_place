import {
  ArrowRight,
  CircleAlert,
  CircleHelp,
  ExternalLink,
  FileText,
  Images,
  ListChecks,
  MessageSquareQuote,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requerirRol } from "@/server/services/auth";
import { camposPendientes, obtenerContenidoSitio } from "@/server/services/contenido";

export const metadata: Metadata = { title: "Sitio web" };

/** Índice del módulo: qué falta completar y acceso a cada parte editable del sitio. */
export default async function SitioPage() {
  await requerirRol("sitio");
  const { config, servicios, razones, testimonios, preguntas, fotos } =
    await obtenerContenidoSitio();
  const pendientes = camposPendientes(config);

  const partes: {
    href: string;
    titulo: string;
    detalle: string;
    icono: LucideIcon;
    vacia?: boolean;
  }[] = [
    {
      href: "/admin/sitio/informacion",
      titulo: "Información del hogar",
      detalle: "Nombre, contacto, WhatsApp, dirección, horario, portada, textos y privacidad.",
      icono: FileText,
    },
    {
      href: "/admin/sitio/fotos",
      titulo: "Fotos",
      detalle: `Foto de portada y galería (${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}).`,
      icono: Images,
      vacia: fotos.length === 0,
    },
    {
      href: "/admin/sitio/servicios",
      titulo: "Servicios",
      detalle: `${servicios.length} en el sitio.`,
      icono: ListChecks,
      vacia: servicios.length === 0,
    },
    {
      href: "/admin/sitio/razones",
      titulo: "Por qué elegirnos",
      detalle: `${razones.length} en el sitio.`,
      icono: ThumbsUp,
      vacia: razones.length === 0,
    },
    {
      href: "/admin/sitio/testimonios",
      titulo: "Testimonios",
      detalle: `${testimonios.length} en el sitio.`,
      icono: MessageSquareQuote,
      vacia: testimonios.length === 0,
    },
    {
      href: "/admin/sitio/preguntas",
      titulo: "Preguntas frecuentes",
      detalle: `${preguntas.length} en el sitio.`,
      icono: CircleHelp,
      vacia: preguntas.length === 0,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Sitio web</h1>
          <p className="mt-1 text-tinta-suave">
            Lo que guardes aquí se ve en el sitio de inmediato, sin volver a publicarlo.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border-2 border-salvia-700 bg-white px-5 font-semibold text-salvia-800 hover:bg-salvia-50"
        >
          <ExternalLink className="size-5" aria-hidden="true" />
          Ver el sitio
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      </header>

      {pendientes.length > 0 ? (
        <section
          aria-labelledby="titulo-pendientes"
          className="rounded-2xl border-2 border-terracota bg-white p-5"
        >
          <h2
            id="titulo-pendientes"
            className="flex items-center gap-2 font-sans text-lg font-bold"
          >
            <CircleAlert className="size-5 text-terracota" aria-hidden="true" />
            Datos por completar
          </h2>
          <ul className="mt-2 list-disc pl-6 text-base">
            {pendientes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <Link
            href="/admin/sitio/informacion"
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-salvia-800 underline"
          >
            Completar información
          </Link>
        </section>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {partes.map(({ href, titulo, detalle, icono: IconoParte, vacia }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-full items-center gap-4 rounded-2xl border border-salvia-200 bg-white p-5 shadow-sm hover:border-salvia-700"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-salvia-100 text-salvia-800">
                <IconoParte className="size-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">{titulo}</span>
                <span className="block text-base text-tinta-suave">{detalle}</span>
                {vacia ? (
                  <span className="mt-1 block text-base font-semibold text-terracota">
                    Sección oculta en el sitio (sin contenido)
                  </span>
                ) : null}
              </span>
              <ArrowRight className="size-5 shrink-0 text-salvia-700" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
