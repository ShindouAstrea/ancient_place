import "server-only";

import { crearClienteServidor } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/types/database";
import type {
  EventoAuditoria,
  FichaPaciente,
  Medicamento,
  ResumenPaciente,
} from "@/types/pacientes";

import { ErrorRepositorio } from "./errores";

/**
 * Fichas de pacientes. Todas las consultas usan la sesión del usuario: RLS decide qué
 * puede ver (roles "pacientes" y "pacientes_lectura") y qué puede cambiar (solo
 * "pacientes"). Los cambios quedan en la auditoría mediante triggers de la base.
 */

const COLUMNAS_MEDICAMENTO =
  "id, nombre, dosis, indicaciones, situacional, motivo_situacional, horarios, dias";

/** Postgres devuelve las horas como "08:00:00": se muestran como "08:00". */
function aMedicamento(fila: Omit<Medicamento, "horarios"> & { horarios: string[] }): Medicamento {
  return { ...fila, horarios: fila.horarios.map((h) => h.slice(0, 5)).sort() };
}

export async function listarPacientes(egresados: boolean): Promise<ResumenPaciente[]> {
  const supabase = await crearClienteServidor();
  const consulta = supabase
    .from("pacientes")
    .select(
      "id, nombres, apellidos, habitacion, fecha_nacimiento, deterioro_cognitivo, alergias, fecha_egreso, medicamentos(count)",
    )
    .order("apellidos")
    .order("nombres");
  const { data, error } = egresados
    ? await consulta.not("fecha_egreso", "is", null)
    : await consulta.is("fecha_egreso", null);
  if (error) throw new ErrorRepositorio("listar_pacientes", error.code);

  return data.map(({ medicamentos, ...paciente }) => ({
    ...paciente,
    cantidadMedicamentos: medicamentos[0]?.count ?? 0,
  }));
}

export async function leerFicha(id: string): Promise<FichaPaciente | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("pacientes")
    .select(`*, medicamentos(${COLUMNAS_MEDICAMENTO})`)
    .eq("id", id)
    .order("nombre", { referencedTable: "medicamentos" })
    .maybeSingle();
  if (error) throw new ErrorRepositorio("leer_ficha", error.code);
  if (!data) return null;

  const { medicamentos, created_by, updated_by, ...paciente } = data;
  return { ...paciente, medicamentos: medicamentos.map(aMedicamento) };
}

/** Id de la ficha a la que apunta un código QR (null si no existe o ya se regeneró). */
export async function buscarPorCodigoQr(codigo: string): Promise<string | null> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("pacientes")
    .select("id")
    .eq("codigo_qr", codigo)
    .maybeSingle();
  if (error) throw new ErrorRepositorio("buscar_codigo_qr", error.code);
  return data?.id ?? null;
}

/** Registra en la auditoría que el usuario abrió la ficha. */
export async function registrarConsulta(id: string): Promise<void> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("registrar_consulta_ficha", { p_paciente_id: id });
  if (error) throw new ErrorRepositorio("registrar_consulta_ficha", error.code);
}

export type ResultadoEscritura =
  { tipo: "ok" } | { tipo: "rut-repetido" } | { tipo: "sin-permiso" };

/** Crea una ficha y devuelve su id. */
export async function insertarPaciente(
  datos: TablesInsert<"pacientes">,
): Promise<{ tipo: "ok"; id: string } | { tipo: "rut-repetido" }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("pacientes").insert(datos).select("id").single();
  if (error?.code === "23505") return { tipo: "rut-repetido" };
  if (error) throw new ErrorRepositorio("insertar_paciente", error.code);
  return { tipo: "ok", id: data.id };
}

export async function actualizarPaciente(
  id: string,
  datos: TablesUpdate<"pacientes">,
): Promise<ResultadoEscritura> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("pacientes").update(datos).eq("id", id).select("id");
  if (error?.code === "23505") return { tipo: "rut-repetido" };
  if (error) throw new ErrorRepositorio("actualizar_paciente", error.code);
  // RLS filtra en silencio: 0 filas = la ficha no existe o no hay permiso para editarla.
  return data.length === 1 ? { tipo: "ok" } : { tipo: "sin-permiso" };
}

export async function insertarMedicamento(datos: TablesInsert<"medicamentos">): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("medicamentos").insert(datos);
  if (error?.code === "42501") return false;
  if (error) throw new ErrorRepositorio("insertar_medicamento", error.code);
  return true;
}

export async function actualizarMedicamento(
  id: string,
  pacienteId: string,
  datos: TablesUpdate<"medicamentos">,
): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("medicamentos")
    .update(datos)
    .eq("id", id)
    .eq("paciente_id", pacienteId)
    .select("id");
  if (error) throw new ErrorRepositorio("actualizar_medicamento", error.code);
  return data.length === 1;
}

export async function borrarMedicamento(id: string, pacienteId: string): Promise<boolean> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("medicamentos")
    .delete()
    .eq("id", id)
    .eq("paciente_id", pacienteId)
    .select("id");
  if (error) throw new ErrorRepositorio("borrar_medicamento", error.code);
  return data.length === 1;
}

/** Últimos eventos de auditoría de una ficha (RLS: solo el rol "pacientes" los ve). */
export async function leerAuditoria(
  pacienteId: string,
  limite: number,
): Promise<EventoAuditoria[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("auditoria_fichas")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false })
    .limit(limite);
  if (error) throw new ErrorRepositorio("leer_auditoria", error.code);
  return data;
}
