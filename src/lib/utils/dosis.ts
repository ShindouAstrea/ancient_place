import type { Administracion, Medicamento } from "@/types/pacientes";

import { diaAnterior, diaSemanaIso, minutosLocales, type MomentoLocal } from "./fechas";

/** Una dosis "toca ahora" hasta 60 minutos antes o después de su hora; luego, está atrasada. */
export const TOLERANCIA_MINUTOS = 60;
/** Se puede registrar hasta 2 horas antes de su hora (la base de datos exige lo mismo). */
export const ANTICIPACION_MAXIMA_MINUTOS = 120;
/** Pasada la medianoche, las dosis de anoche siguen a la vista durante 6 horas (turno de noche). */
export const HORAS_TURNO_NOCHE = 6;

export type EstadoDosis = "registrada" | "atrasada" | "ahora" | "pendiente";

export type DosisProgramada = {
  clave: string;
  medicamento: Medicamento;
  fecha: string;
  hora: string;
  /** Para ordenar y comparar con "ahora" (ver MomentoLocal). */
  minutos: number;
  estado: EstadoDosis;
  registro: Administracion | null;
  esDeAyer: boolean;
  /** Ya se puede registrar (no falta más de 2 horas). */
  registrable: boolean;
};

/**
 * Dosis programadas de hoy (y las de anoche aún recientes), con su estado:
 * registrada, atrasada (más de 1 hora tarde), "ahora" o pendiente.
 * Solo cuentan los días de la semana del medicamento y los registros no anulados.
 */
export function dosisProgramadas(
  medicamentos: readonly Medicamento[],
  registros: readonly Administracion[],
  ahora: MomentoLocal,
): DosisProgramada[] {
  const ayer = diaAnterior(ahora.fecha);
  const vigentes = registros.filter((r) => !r.anulada_en && r.hora_programada);
  const lista: DosisProgramada[] = [];

  for (const fecha of [ayer, ahora.fecha]) {
    const dia = diaSemanaIso(fecha);
    for (const medicamento of medicamentos) {
      if (medicamento.situacional || !medicamento.dias.includes(dia)) continue;
      for (const hora of medicamento.horarios) {
        const minutos = minutosLocales(fecha, hora);
        const esDeAyer = fecha === ayer;
        if (esDeAyer && ahora.minutos - minutos > HORAS_TURNO_NOCHE * 60) continue;

        const registro =
          vigentes.find(
            (r) =>
              r.medicamento_id === medicamento.id &&
              r.fecha === fecha &&
              r.hora_programada === hora,
          ) ?? null;
        const diferencia = ahora.minutos - minutos;
        const estado: EstadoDosis = registro
          ? "registrada"
          : diferencia > TOLERANCIA_MINUTOS
            ? "atrasada"
            : -diferencia > TOLERANCIA_MINUTOS
              ? "pendiente"
              : "ahora";

        lista.push({
          clave: `${medicamento.id}|${fecha}|${hora}`,
          medicamento,
          fecha,
          hora,
          minutos,
          estado,
          registro,
          esDeAyer,
          registrable: -diferencia <= ANTICIPACION_MAXIMA_MINUTOS,
        });
      }
    }
  }
  return lista.sort((a, b) => a.minutos - b.minutos);
}

/** Desde qué hora se puede registrar una dosis: "08:00" → "06:00". */
export function horaDesdeRegistrable(hora: string): string {
  const [h = 0, m = 0] = hora.split(":").map(Number);
  const total = (h * 60 + m - ANTICIPACION_MAXIMA_MINUTOS + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Última vez que se dio cada medicamento situacional (registros no anulados). */
export function ultimaDosis(
  medicamentoId: string,
  registros: readonly Administracion[],
): Administracion | null {
  return (
    registros
      .filter(
        (r) =>
          r.medicamento_id === medicamentoId && !r.anulada_en && r.resultado === "administrada",
      )
      .sort((a, b) => b.registrado_en.localeCompare(a.registrado_en))[0] ?? null
  );
}
