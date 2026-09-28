import "server-only";

import { envServidor } from "@/lib/env";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { DatosContacto } from "@/server/validators/contacto";

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
