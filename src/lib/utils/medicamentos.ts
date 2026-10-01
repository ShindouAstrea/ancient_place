import type { Medicamento } from "@/types/pacientes";

import { describirDias } from "./horario";

export type TomaProgramada = { hora: string; medicamentos: Medicamento[] };

/**
 * Medicamentos programados agrupados por hora, en el orden del día: responde de un
 * vistazo «¿qué le toca a esta hora?». Los situacionales van aparte.
 */
export function agendaPorHora(medicamentos: readonly Medicamento[]): TomaProgramada[] {
  const porHora = new Map<string, Medicamento[]>();
  for (const medicamento of medicamentos) {
    if (medicamento.situacional) continue;
    for (const hora of medicamento.horarios) {
      porHora.set(hora, [...(porHora.get(hora) ?? []), medicamento]);
    }
  }
  return [...porHora.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hora, lista]) => ({ hora, medicamentos: lista }));
}

/** "Solo lunes", "Solo lunes, miércoles y viernes"; null si es todos los días. */
export function diasDelMedicamento(dias: readonly number[]): string | null {
  if (dias.length >= 7) return null;
  const texto = describirDias(dias);
  return `Solo ${texto.charAt(0).toLowerCase()}${texto.slice(1)}`;
}
