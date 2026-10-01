import "server-only";

import { ahoraEnChile, diaAnterior } from "@/lib/utils/fechas";
import { dosisProgramadas, ultimaDosis, type DosisProgramada } from "@/lib/utils/dosis";
import {
  anularRegistro,
  insertarRegistro,
  leerProgramadosActivos,
  leerRegistrosDesde,
  leerRegistrosPaciente,
  type ResultadoRegistro,
} from "@/server/repositories/dosis";
import { leerFicha, registrarConsulta } from "@/server/repositories/pacientes";
import type { DatosDosisProgramada } from "@/server/validators/dosis";
import type { Medicamento } from "@/types/pacientes";

import { requerirVerFichas } from "./pacientes";

/**
 * Registro de administración de medicamentos. Ver y registrar: roles "pacientes" y
 * "pacientes_lectura" (quienes dan los medicamentos); RLS lo vuelve a exigir.
 */

/** "AAAA-MM-DD" de hace n días (hora de Chile). */
function haceDias(fecha: string, dias: number): string {
  let resultado = fecha;
  for (let i = 0; i < dias; i++) resultado = diaAnterior(resultado);
  return resultado;
}

/** Dosis de hoy de un residente (sección «Dosis de hoy» de la ficha). */
export async function obtenerDosisDeHoy(pacienteId: string, medicamentos: Medicamento[]) {
  await requerirVerFichas();
  const ahora = ahoraEnChile();
  // Una semana: alcanza para mostrar la última vez que se dio un situacional.
  const registros = await leerRegistrosPaciente(pacienteId, haceDias(ahora.fecha, 7));
  return {
    ahora,
    programadas: dosisProgramadas(medicamentos, registros, ahora),
    situacionales: medicamentos
      .filter((m) => m.situacional)
      .map((medicamento) => ({ medicamento, ultima: ultimaDosis(medicamento.id, registros) })),
  };
}

export type DosisRonda = DosisProgramada & {
  residente: { id: string; nombre: string; habitacion: string };
};

/** Ronda: dosis de hoy de todos los residentes activos, en orden de hora. */
export async function obtenerRonda() {
  await requerirVerFichas({ volverA: "/admin/pacientes/ronda" });
  const ahora = ahoraEnChile();
  const [residentes, registros] = await Promise.all([
    leerProgramadosActivos(),
    leerRegistrosDesde(diaAnterior(ahora.fecha)),
  ]);
  const dosis: DosisRonda[] = residentes.flatMap((r) =>
    dosisProgramadas(r.medicamentos, registros, ahora).map((d) => ({
      ...d,
      residente: { id: r.id, nombre: `${r.nombres} ${r.apellidos}`, habitacion: r.habitacion },
    })),
  );
  // El orden de los residentes (por apellido) se conserva dentro de cada hora.
  return { ahora, dosis: dosis.sort((a, b) => a.minutos - b.minutos) };
}

/** Historial de dosis de una ficha (últimos días). Queda registrado como consulta. */
export async function obtenerRegistroDosis(pacienteId: string, dias: number) {
  const admin = await requerirVerFichas({ volverA: `/admin/pacientes/${pacienteId}/dosis` });
  const ficha = await leerFicha(pacienteId);
  if (!ficha) return { ficha: null, registros: [], admin };
  try {
    await registrarConsulta(pacienteId);
  } catch (error) {
    console.error("[dosis] No se pudo registrar la consulta:", (error as Error).message);
  }
  const registros = await leerRegistrosPaciente(pacienteId, haceDias(ahoraEnChile().fecha, dias));
  return { ficha, registros, admin };
}

export async function registrarDosisProgramada(
  datos: DatosDosisProgramada,
): Promise<ResultadoRegistro> {
  await requerirVerFichas();
  return insertarRegistro({
    medicamento_id: datos.medicamentoId,
    fecha: datos.fecha,
    hora_programada: datos.hora,
    resultado: datos.resultado,
    motivo_omision: datos.motivo,
    observacion: datos.observacion,
  });
}

export async function registrarDosisSituacional(
  medicamentoId: string,
  observacion: string,
): Promise<ResultadoRegistro> {
  await requerirVerFichas();
  // La base de datos fija la fecha (hoy, hora de Chile); la de aquí es solo de relleno.
  return insertarRegistro({
    medicamento_id: medicamentoId,
    fecha: ahoraEnChile().fecha,
    resultado: "administrada",
    observacion,
  });
}

/** Anula un registro (quien lo hizo, o el rol "pacientes"). false si no se puede. */
export async function anularDosis(id: string, motivo: string): Promise<boolean> {
  await requerirVerFichas();
  return anularRegistro(id, motivo);
}
