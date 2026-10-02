import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { crearClienteServidor } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import type { RolAdmin } from "./auth";
import { ErrorRepositorio } from "./errores";

/**
 * Cuentas del panel. Todo pasa por funciones de la base de datos que exigen el rol
 * "usuarios" (SECURITY DEFINER: escriben en auth.users sin service_role key). La base
 * también impide desactivar la propia cuenta, quitarse ese rol o darse una contraseña
 * temporal, y registra cada cambio en auditoria_usuarios.
 */

export type Cuenta = {
  id: string;
  email: string;
  nombre: string;
  activa: boolean;
  roles: RolAdmin[];
  creadaEn: string;
  ultimoIngreso: string | null;
  /** Todavía usa la contraseña temporal que se le asignó. */
  contrasenaTemporal: boolean;
};

export type EventoCuenta = {
  id: number;
  fecha: string;
  usuario_email: string | null;
  accion: string;
  antes: Json | null;
  despues: Json | null;
};

export async function listarCuentas(): Promise<Cuenta[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("listar_usuarios");
  if (error) throw new ErrorRepositorio("listar_usuarios", error.code);
  return data.map((c) => ({
    id: c.user_id,
    email: c.email,
    nombre: c.nombre,
    activa: c.activo,
    roles: c.roles,
    creadaEn: c.creado_en,
    // Los tipos generados no lo marcan, pero es null si la persona nunca ingresó.
    ultimoIngreso: (c.ultimo_ingreso as string | null) ?? null,
    contrasenaTemporal: c.contrasena_temporal,
  }));
}

export async function leerHistorialCuenta(id: string, limite: number): Promise<EventoCuenta[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("auditoria_usuarios")
    .select("id, fecha, usuario_email, accion, antes, despues")
    .eq("cuenta_id", id)
    .order("fecha", { ascending: false })
    .limit(limite);
  if (error) throw new ErrorRepositorio("leer_historial_cuenta", error.code);
  return data;
}

export type ResultadoCuenta =
  { tipo: "ok" } | { tipo: "regla"; codigo: string } | { tipo: "sin-permiso" };

/** Traduce el error de una función de cuentas; los inesperados se lanzan (sin datos personales). */
function resultado(operacion: string, error: PostgrestError | null): ResultadoCuenta {
  if (!error) return { tipo: "ok" };
  if (error.code === "42501") return { tipo: "sin-permiso" };
  // Correo repetido: también si dos personas crean la misma cuenta a la vez (índice único).
  if (error.code === "23505") return { tipo: "regla", codigo: "correo_existente" };
  // Reglas de la base de datos: el mensaje es un código fijo (ej: "propia_cuenta").
  if (error.code === "22023" || error.code === "P0001" || error.code === "P0002") {
    return { tipo: "regla", codigo: error.message };
  }
  throw new ErrorRepositorio(operacion, error.code);
}

export async function insertarCuenta(
  datos: { email: string; nombre: string; roles: RolAdmin[] },
  contrasenaTemporal: string,
): Promise<{ tipo: "ok"; id: string } | Exclude<ResultadoCuenta, { tipo: "ok" }>> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("crear_usuario", {
    p_email: datos.email,
    p_nombre: datos.nombre,
    p_roles: datos.roles,
    p_contrasena: contrasenaTemporal,
  });
  const r = resultado("crear_usuario", error);
  return r.tipo === "ok" ? { tipo: "ok", id: data as string } : r;
}

export async function actualizarCuenta(
  id: string,
  datos: { nombre: string; roles: RolAdmin[] },
): Promise<ResultadoCuenta> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("actualizar_usuario", {
    p_user_id: id,
    p_nombre: datos.nombre,
    p_roles: datos.roles,
  });
  return resultado("actualizar_usuario", error);
}

export async function actualizarEstadoCuenta(
  id: string,
  activa: boolean,
): Promise<ResultadoCuenta> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_estado_usuario", {
    p_user_id: id,
    p_activo: activa,
  });
  return resultado("cambiar_estado_usuario", error);
}

export async function guardarContrasenaTemporal(
  id: string,
  contrasenaTemporal: string,
): Promise<ResultadoCuenta> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("asignar_contrasena_temporal", {
    p_user_id: id,
    p_contrasena: contrasenaTemporal,
  });
  return resultado("asignar_contrasena_temporal", error);
}
