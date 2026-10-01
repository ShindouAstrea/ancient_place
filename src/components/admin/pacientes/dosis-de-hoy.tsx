import { Siren } from "lucide-react";

import type { DosisProgramada } from "@/lib/utils/dosis";
import { formatearHora, tiempoRelativo } from "@/lib/utils/fechas";
import type { Administracion, Medicamento } from "@/types/pacientes";

import { AccionSituacional } from "./acciones-dosis";
import { FilaDosis } from "./fila-dosis";

/**
 * «Dosis de hoy» en la ficha: las programadas con su estado (y los botones para
 * registrarlas) y los situacionales, con cuándo se dio la última dosis.
 */
export function DosisDeHoy({
  programadas,
  situacionales,
}: {
  programadas: DosisProgramada[];
  situacionales: { medicamento: Medicamento; ultima: Administracion | null }[];
}) {
  if (programadas.length === 0 && situacionales.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-5 text-tinta-suave">
        Hoy no tiene dosis programadas.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {programadas.length > 0 ? (
        <ol className="divide-y divide-salvia-100 rounded-2xl border border-salvia-200 bg-white">
          {programadas.map((dosis) => (
            <li key={dosis.clave} className="p-4">
              <FilaDosis dosis={dosis} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-tinta-suave">Hoy no tiene dosis programadas.</p>
      )}

      {situacionales.length > 0 ? (
        <ul className="space-y-3">
          {situacionales.map(({ medicamento, ultima }) => (
            <li
              key={medicamento.id}
              className="rounded-2xl border border-l-4 border-salvia-200 border-l-terracota bg-white p-4"
            >
              <p className="flex gap-2 [overflow-wrap:anywhere]">
                <Siren className="mt-1 size-5 shrink-0 text-terracota" aria-hidden="true" />
                <span>
                  <span className="font-semibold">{medicamento.nombre}</span>
                  <span className="text-tinta-suave"> — {medicamento.dosis} (situacional)</span>
                  <span className="block text-base">Cuándo: {medicamento.motivo_situacional}</span>
                </span>
              </p>
              <p className="mt-1 text-base [overflow-wrap:anywhere] text-tinta-suave">
                {ultima
                  ? `Última dosis: ${tiempoRelativo(ultima.registrado_en)} (${formatearHora(ultima.registrado_en)})${ultima.observacion ? ` · ${ultima.observacion}` : ""}`
                  : "Sin dosis en los últimos 7 días."}
              </p>
              <AccionSituacional medicamentoId={medicamento.id} nombre={medicamento.nombre} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
