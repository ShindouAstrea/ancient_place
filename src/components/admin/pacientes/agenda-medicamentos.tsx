import { Clock, Pill, Siren } from "lucide-react";

import { agendaPorHora, diasDelMedicamento } from "@/lib/utils/medicamentos";
import type { Medicamento } from "@/types/pacientes";

/** "Losartán — 50 mg" con sus detalles (días e indicaciones) debajo. */
function LineaMedicamento({ medicamento }: { medicamento: Medicamento }) {
  const detalles = [diasDelMedicamento(medicamento.dias), medicamento.indicaciones].filter(Boolean);
  return (
    <>
      <span className="font-semibold [overflow-wrap:anywhere]">{medicamento.nombre}</span>
      <span className="text-tinta-suave"> — {medicamento.dosis}</span>
      {detalles.length > 0 ? (
        <span className="block text-base [overflow-wrap:anywhere] text-tinta-suave">
          {detalles.join(" · ")}
        </span>
      ) : null}
    </>
  );
}

/**
 * Medicamentos de la ficha, pensados para quien los administra: los programados
 * ordenados por hora y los situacionales aparte, con la situación en que se dan.
 */
export function AgendaMedicamentos({ medicamentos }: { medicamentos: Medicamento[] }) {
  const agenda = agendaPorHora(medicamentos);
  const situacionales = medicamentos.filter((m) => m.situacional);

  if (medicamentos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-5 text-tinta-suave">
        No tiene medicamentos registrados.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {agenda.length > 0 ? (
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="size-5 text-salvia-700" aria-hidden="true" />
            Programados, por hora
          </h3>
          <ol className="mt-3 divide-y divide-salvia-100 rounded-2xl border border-salvia-200 bg-white">
            {agenda.map(({ hora, medicamentos: lista }) => (
              <li key={hora} className="flex gap-4 p-4">
                <time
                  dateTime={hora}
                  className="w-16 shrink-0 font-serif text-xl font-semibold text-salvia-800 tabular-nums"
                >
                  {hora}
                </time>
                <ul className="min-w-0 flex-1 space-y-2">
                  {lista.map((m) => (
                    <li key={m.id}>
                      <LineaMedicamento medicamento={m} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {situacionales.length > 0 ? (
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Siren className="size-5 text-terracota" aria-hidden="true" />
            Situacionales (solo si se necesitan)
          </h3>
          <ul className="mt-3 space-y-3">
            {situacionales.map((m) => (
              <li
                key={m.id}
                className="flex gap-3 rounded-2xl border border-l-4 border-salvia-200 border-l-terracota bg-white p-4"
              >
                <Pill className="mt-1 size-5 shrink-0 text-terracota" aria-hidden="true" />
                <div className="min-w-0">
                  <LineaMedicamento medicamento={m} />
                  <p className="mt-1 [overflow-wrap:anywhere]">
                    <span className="font-semibold">Cuándo: </span>
                    {m.motivo_situacional}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
