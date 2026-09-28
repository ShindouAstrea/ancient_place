import "server-only";

import { envServidor } from "@/lib/env";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import type { DatosContacto } from "@/server/validators/contacto";
import type { EstadoLead } from "@/server/validators/leads";

import { ErrorRepositorio } from "./errores";

/**
 * Crea un lead mediante la función `crear_lead` de la base de datos, que exige el
 * secreto compartido del servidor (no existe INSERT directo sobre la tabla).
 * Devuelve el id del lead creado.
 */
export async function crearLead(datos: DatosContacto): Promise<string> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.rpc("crear_lead", {
    p_secreto: envServidor().SUPABASE_FORMULARIO_SECRETO,
    p_nombre: datos.nombre,
    p_telefono: datos.telefono,
    p_email: datos.email,
    p_parentesco: datos.parentesco ?? "",
    p_mensaje: datos.mensaje,
    p_consentimiento: datos.consentimiento,
  });

  if (error || !data) throw new ErrorRepositorio("crear_lead", error?.code);
  return data;
}

// -----------------------------------------------------------------------------
// Panel de administración. Estas consultas usan la sesión del usuario (cookies):
// RLS solo devuelve/modifica filas si es administrador (función is_admin()).
// -----------------------------------------------------------------------------

const COLUMNAS_PANEL =
  "id, nombre, telefono, email, parentesco, mensaje, estado, created_at, fecha_consentimiento";

export type LeadPanel = Pick<
  Tables<"leads">,
  | "id"
  | "nombre"
  | "telefono"
  | "email"
  | "parentesco"
  | "mensaje"
  | "estado"
  | "created_at"
  | "fecha_consentimiento"
>;

export type ConteoLeads = Record<EstadoLead | "total", number>;

/** Leads del más reciente al más antiguo, opcionalmente filtrados por estado. */
export async function listarLeads(opciones: {
  estado?: EstadoLead;
  desde: number;
  cantidad: number;
}): Promise<LeadPanel[]> {
  const supabase = await crearClienteServidor();

  let consulta = supabase
    .from("leads")
    .select(COLUMNAS_PANEL)
    .order("created_at", { ascending: false })
    .range(opciones.desde, opciones.desde + opciones.cantidad - 1);
  if (opciones.estado) consulta = consulta.eq("estado", opciones.estado);

  const { data, error } = await consulta;
  if (error) throw new ErrorRepositorio("listar_leads", error.code);
  return data;
}

/** Cantidad de leads por estado y total (consultas HEAD: no transfieren filas). */
export async function contarLeadsPorEstado(): Promise<ConteoLeads> {
  const supabase = await crearClienteServidor();

  const contar = async (estado?: EstadoLead) => {
    let consulta = supabase.from("leads").select("id", { count: "exact", head: true });
    if (estado) consulta = consulta.eq("estado", estado);
    const { count, error } = await consulta;
    if (error) throw new ErrorRepositorio("contar_leads", error.code);
    return count ?? 0;
  };

  const [total, nuevo, contactado, descartado] = await Promise.all([
    contar(),
    contar("nuevo"),
    contar("contactado"),
    contar("descartado"),
  ]);
  return { total, nuevo, contactado, descartado };
}

/**
 * Cambia el estado de un lead. Devuelve false si no se modificó ninguna fila:
 * el lead no existe o RLS lo impidió (usuario sin rol de administrador).
 */
export async function actualizarEstadoLead(id: string, estado: EstadoLead): Promise<boolean> {
  const supabase = await crearClienteServidor();

  const { data, error } = await supabase.from("leads").update({ estado }).eq("id", id).select("id");

  if (error) throw new ErrorRepositorio("actualizar_estado_lead", error.code);
  return data.length === 1;
}
