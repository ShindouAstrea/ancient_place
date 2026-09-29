import { ArrowRight, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { IconoAdmin } from "@/components/admin/icono-admin";
import { modulosPara, NOMBRES_ROL } from "@/config/admin";
import { cn } from "@/lib/utils/cn";
import { requerirAdmin } from "@/server/services/auth";
import { obtenerResumenLeads } from "@/server/services/leads";
import { ESTADOS_LEAD, ETIQUETAS_ESTADO } from "@/server/validators/leads";

export const metadata: Metadata = { title: "Inicio" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Punto de entrada del panel: resumen de contactos y módulos según los roles. */
export default async function InicioPanelPage({ searchParams }: Props) {
  const admin = await requerirAdmin();
  const { aviso } = await searchParams;
  const esSitio = admin.roles.includes("sitio");
  const resumen = esSitio ? await obtenerResumenLeads() : null;
  const modulos = modulosPara(admin.roles);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-semibold">Hola</h1>
        <p className="mt-1 [overflow-wrap:anywhere] text-tinta-suave">
          Ingresaste como {admin.email}.
          {admin.roles.length > 0
            ? ` Acceso: ${admin.roles.map((r) => NOMBRES_ROL[r]).join(" y ")}.`
            : null}
        </p>
      </header>

      {aviso === "sin-permiso" ? (
        <p
          role="alert"
          className="flex gap-3 rounded-xl border-2 border-terracota bg-white p-4 text-base"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
          Tu cuenta no tiene permiso para entrar a esa sección. Si lo necesitas, pide que te asignen
          el rol correspondiente.
        </p>
      ) : null}

      {admin.roles.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-base">
          Tu cuenta todavía no tiene roles asignados, por eso no ves módulos. Pide a quien
          administra el sistema que te asigne uno.
        </p>
      ) : null}

      {resumen ? (
        <section aria-labelledby="titulo-resumen">
          <h2 id="titulo-resumen" className="text-2xl font-semibold">
            Contactos
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ESTADOS_LEAD.map((estado) => (
              <li key={estado}>
                <Link
                  href={`/admin/leads?estado=${estado}`}
                  className={cn(
                    "flex min-h-24 flex-col justify-center rounded-2xl border bg-white p-4 shadow-sm hover:border-salvia-700",
                    estado === "nuevo" && resumen.nuevo > 0
                      ? "border-terracota"
                      : "border-salvia-200",
                  )}
                >
                  <span className="font-serif text-3xl font-semibold text-salvia-900">
                    {resumen[estado]}
                  </span>
                  <span className="text-base text-tinta-suave">
                    {ETIQUETAS_ESTADO[estado].plural}
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/admin/leads"
                className="flex min-h-24 flex-col justify-center rounded-2xl border border-salvia-200 bg-white p-4 shadow-sm hover:border-salvia-700"
              >
                <span className="font-serif text-3xl font-semibold text-salvia-900">
                  {resumen.total}
                </span>
                <span className="text-base text-tinta-suave">Total</span>
              </Link>
            </li>
          </ul>
        </section>
      ) : null}

      {modulos.length > 0 ? (
        <section aria-labelledby="titulo-modulos">
          <h2 id="titulo-modulos" className="text-2xl font-semibold">
            Módulos
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {modulos.map((modulo) => {
              const contenido = (
                <>
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-salvia-100 text-salvia-800">
                    <IconoAdmin nombre={modulo.icono} className="size-6" />
                  </span>
                  {/* min-w-0: permite que el texto se ajuste en pantallas angostas. */}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-lg font-semibold">{modulo.nombre}</span>
                      {modulo.disponible ? null : (
                        <span className="rounded-full bg-stone-200 px-3 py-0.5 text-base font-semibold text-stone-700">
                          Próximamente
                        </span>
                      )}
                    </span>
                    <span className="block text-base text-tinta-suave">{modulo.descripcion}</span>
                  </span>
                </>
              );
              return (
                <li key={modulo.href}>
                  {modulo.disponible ? (
                    <Link
                      href={modulo.href}
                      className="flex h-full items-center gap-4 rounded-2xl border border-salvia-200 bg-white p-5 shadow-sm hover:border-salvia-700"
                    >
                      {contenido}
                      <ArrowRight className="size-5 shrink-0 text-salvia-700" aria-hidden="true" />
                    </Link>
                  ) : (
                    <div className="flex h-full items-center gap-4 rounded-2xl border border-dashed border-salvia-300 bg-white/60 p-5">
                      {contenido}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
