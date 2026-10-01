import { Check, Siren, X } from "lucide-react";
import type { Metadata } from "next";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { AnularRegistro } from "@/components/admin/pacientes/acciones-dosis";
import { FichaNoEncontrada } from "@/components/admin/pacientes/ficha-no-encontrada";
import { cn } from "@/lib/utils/cn";
import { ahoraEnChile, diaAnterior, formatearFecha, formatearFechaHora } from "@/lib/utils/fechas";
import { obtenerRegistroDosis } from "@/server/services/dosis";
import { puedeEditarFichas } from "@/server/services/pacientes";
import { esquemaId } from "@/server/validators/contenido";
import { ETIQUETAS_MOTIVO_OMISION } from "@/server/validators/dosis";
import type { Administracion } from "@/types/pacientes";

export const metadata: Metadata = { title: "Registro de dosis" };

const DIAS = 14;

type Props = { params: Promise<{ id: string }> };

/** Registros agrupados por día, del más reciente al más antiguo. */
function porDia(registros: Administracion[]): [string, Administracion[]][] {
  const grupos = new Map<string, Administracion[]>();
  for (const r of registros) grupos.set(r.fecha, [...(grupos.get(r.fecha) ?? []), r]);
  return [...grupos.entries()].sort(([a], [b]) => b.localeCompare(a));
}

/**
 * Historial de dosis de un residente: qué se dio, qué no y por qué, quién lo registró y
 * cuándo. Los registros no se editan ni se borran: se anulan, y quedan a la vista.
 */
export default async function RegistroDosisPage({ params }: Props) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) return <FichaNoEncontrada />;
  const { ficha, registros, admin } = await obtenerRegistroDosis(id, DIAS);
  if (!ficha) return <FichaNoEncontrada />;

  const hoy = ahoraEnChile().fecha;
  const ayer = diaAnterior(hoy);
  const editor = puedeEditarFichas(admin);

  return (
    <div>
      <EnlaceVolver href={`/admin/pacientes/${id}`}>Ficha</EnlaceVolver>
      <h1 className="text-3xl font-semibold [overflow-wrap:anywhere]">
        Registro de dosis de {ficha.nombres} {ficha.apellidos}
      </h1>
      <p className="mt-1 mb-6 text-tinta-suave">
        Últimos {DIAS} días. Los registros no se borran: si hubo un error, se anulan indicando el
        motivo. Puede anularlos quien los hizo o quien edita fichas.
      </p>

      {registros.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-6 text-center text-tinta-suave">
          No hay dosis registradas en estos días.
        </p>
      ) : (
        <div className="space-y-8">
          {porDia(registros).map(([fecha, lista]) => (
            <section key={fecha} aria-labelledby={`dia-${fecha}`}>
              <h2 id={`dia-${fecha}`} className="text-xl font-semibold">
                {fecha === hoy ? "Hoy" : fecha === ayer ? "Ayer" : formatearFecha(fecha)}
              </h2>
              <ol className="mt-3 space-y-3">
                {lista.map((r) => {
                  const anulado = Boolean(r.anulada_en);
                  const titulo = `${r.hora_programada ?? "Situacional"} · ${r.medicamento_nombre}`;
                  return (
                    <li
                      key={r.id}
                      className={cn(
                        "rounded-2xl border bg-white p-4",
                        anulado ? "border-dashed border-stone-300" : "border-salvia-200",
                      )}
                    >
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        {r.hora_programada ? null : (
                          <Siren className="size-5 shrink-0 text-terracota" aria-hidden="true" />
                        )}
                        <span
                          className={cn(
                            "font-semibold [overflow-wrap:anywhere]",
                            anulado && "line-through",
                          )}
                        >
                          {titulo}
                        </span>
                        <span className="text-tinta-suave">— {r.dosis}</span>
                        {anulado ? (
                          <span className="rounded-full bg-stone-200 px-3 py-0.5 text-base font-semibold text-stone-700">
                            Anulado
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 flex gap-2">
                        {r.resultado === "administrada" ? (
                          <Check
                            className="mt-0.5 size-5 shrink-0 text-salvia-700"
                            aria-hidden="true"
                          />
                        ) : (
                          <X className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
                        )}
                        <span className="[overflow-wrap:anywhere]">
                          {r.resultado === "administrada"
                            ? "Dada"
                            : `No se dio: ${r.motivo_omision ? ETIQUETAS_MOTIVO_OMISION[r.motivo_omision].toLowerCase() : ""}`}
                          {r.observacion ? ` · ${r.observacion}` : null}
                        </span>
                      </p>
                      <p className="mt-1 text-base [overflow-wrap:anywhere] text-tinta-suave">
                        Registró {r.registrado_email ?? "(sin datos)"} ·{" "}
                        {formatearFechaHora(r.registrado_en)}
                      </p>
                      {anulado ? (
                        <p className="mt-1 text-base [overflow-wrap:anywhere]">
                          <span className="font-semibold">Anulado</span> por{" "}
                          {r.anulada_email ?? "(sin datos)"}
                          {r.anulada_en ? ` · ${formatearFechaHora(r.anulada_en)}` : null}:{" "}
                          {r.anulacion_motivo}
                        </p>
                      ) : editor || r.registrado_por === admin.id ? (
                        <AnularRegistro id={r.id} descripcion={titulo} />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
