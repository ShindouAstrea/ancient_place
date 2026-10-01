import { ChevronRight, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { calcularEdad } from "@/lib/utils/fechas";
import type { ResumenPaciente } from "@/types/pacientes";

import { InsigniaDeterioro } from "./insignia-deterioro";

/** Tarjeta del listado de pacientes: toda la tarjeta abre la ficha. */
export function TarjetaPaciente({ paciente }: { paciente: ResumenPaciente }) {
  const detalles = [
    paciente.fecha_nacimiento ? `${calcularEdad(paciente.fecha_nacimiento)} años` : null,
    paciente.habitacion ? `Habitación ${paciente.habitacion}` : null,
    paciente.cantidadMedicamentos === 1
      ? "1 medicamento"
      : `${paciente.cantidadMedicamentos} medicamentos`,
  ].filter(Boolean);

  return (
    <Link
      href={`/admin/pacientes/${paciente.id}`}
      className="flex items-center gap-3 rounded-2xl border border-salvia-200 bg-white p-4 shadow-sm hover:border-salvia-700 sm:p-5"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-semibold [overflow-wrap:anywhere]">
          {paciente.nombres} {paciente.apellidos}
        </span>
        <span className="block text-base text-tinta-suave">{detalles.join(" · ")}</span>
        <span className="mt-2 flex flex-wrap gap-2">
          <InsigniaDeterioro grado={paciente.deterioro_cognitivo} />
          {paciente.alergias ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-terracota-claro px-3 py-1 text-base font-semibold text-terracota">
              <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
              Alergias
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight className="size-6 shrink-0 text-salvia-700" aria-hidden="true" />
    </Link>
  );
}
