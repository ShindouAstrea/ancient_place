import "server-only";

import { crearClienteServidor } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";
import type { Administracion, Medicamento } from "@/types/pacientes";

import { ErrorRepositorio } from "./errores";

/**
 * Registro de dosis (tabla administraciones). Usa la sesión del usuario: RLS permite
 * ver y registrar a los roles "pacientes" y "pacientes_lectura". La base de datos
 * completa quién, cuándo y a qué paciente corresponde, y valida las reglas.
 */

const COLUMNAS_REGISTRO =
  "id, medicamento_id, medicamento_nombre, dosis, fecha, hora_programada, resultado, motivo_omision, observacion, registrado_en, registrado_por, registrado_email, anulada_en, anulada_email, anulacion_motivo";

const COLUMNAS_MEDICAMENTO =
  "id, nombre, dosis, indicaciones, situacional, motivo_situacional, horarios, dias";

/** Postgres devuelve las horas como "08:00:00": se usan como "08:00". */
const hhmm = (hora: string) => hora.slice(0, 5);

function aRegistro(
  fila: Omit<Administracion, "hora_programada"> & { hora_programada: string | null },
) {
  return { ...fila, hora_programada: fila.hora_programada ? hhmm(fila.hora_programada) : null };
}

/** Registros de un paciente desde una fecha ("AAAA-MM-DD"), los más recientes primero. */
export async function leerRegistrosPaciente(
  pacienteId: string,
  desde: string,
): Promise<Administracion[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("administraciones")
    .select(COLUMNAS_REGISTRO)
    .eq("paciente_id", pacienteId)
    .gte("fecha", desde)
    .order("registrado_en", { ascending: false });
  if (error) throw new ErrorRepositorio("leer_registros_paciente", error.code);
  return data.map(aRegistro);
}

/** Registros programados vigentes (no anulados) de todos los residentes, desde una fecha. */
export async function leerRegistrosDesde(desde: string): Promise<Administracion[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("administraciones")
    .select(COLUMNAS_REGISTRO)
    .gte("fecha", desde)
    .is("anulada_en", null)
    .not("hora_programada", "is", null);
  if (error) throw new ErrorRepositorio("leer_registros", error.code);
  return data.map(aRegistro);
}

export type ResidenteConMedicamentos = {
  id: string;
  nombres: string;
  apellidos: string;
  habitacion: string;
  medicamentos: Medicamento[];
};

/** Residentes activos con sus medicamentos programados (para la ronda). */
export async function leerProgramadosActivos(): Promise<ResidenteConMedicamentos[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("pacientes")
    .select(`id, nombres, apellidos, habitacion, medicamentos(${COLUMNAS_MEDICAMENTO})`)
    .is("fecha_egreso", null)
    .eq("medicamentos.situacional", false)
    .order("apellidos")
    .order("nombres");
  if (error) throw new ErrorRepositorio("leer_programados", error.code);
  return data.map((p) => ({
    ...p,
    medicamentos: p.medicamentos.map((m) => ({ ...m, horarios: m.horarios.map(hhmm).sort() })),
  }));
}

export type ResultadoRegistro =
  | { tipo: "ok" }
  | { tipo: "ya-registrada" }
  | { tipo: "regla"; codigo: string }
  | { tipo: "sin-permiso" };

/**
 * Lo que envía la aplicación (coincide con el GRANT de la tabla). El paciente, el nombre y
 * la dosis del medicamento, quién y cuándo los fija el trigger de la base de datos.
 */
export type NuevoRegistro = Pick<
  TablesInsert<"administraciones">,
  "medicamento_id" | "fecha" | "hora_programada" | "resultado" | "motivo_omision" | "observacion"
>;

export async function insertarRegistro(datos: NuevoRegistro): Promise<ResultadoRegistro> {
  const supabase = await crearClienteServidor();
  // Los tipos generados exigen las columnas que completa el trigger: se omiten a propósito.
  const { error } = await supabase
    .from("administraciones")
    .insert(datos as TablesInsert<"administraciones">);
  if (!error) return { tipo: "ok" };
  if (error.code === "23505") return { tipo: "ya-registrada" };
  // P0001: regla de privado.preparar_administracion; el mensaje es un código fijo.
  if (error.code === "P0001") return { tipo: "regla", codigo: error.message };
  if (error.code === "42501") return { tipo: "sin-permiso" };
  throw new ErrorRepositorio("insertar_registro", error.code);
}

export async function anularRegistro(id: string, motivo: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("anular_administracion", { p_id: id, p_motivo: motivo });
  if (error?.code === "42501") return false;
  if (error) throw new ErrorRepositorio("anular_registro", error.code);
  return true;
}
