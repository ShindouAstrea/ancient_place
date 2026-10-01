import { Eye, FilePlus, Pencil, Trash2 } from "lucide-react";

import { formatearFecha, formatearFechaHora } from "@/lib/utils/fechas";
import { describirDias } from "@/lib/utils/horario";
import { ETIQUETAS_DETERIORO, ETIQUETAS_SEXO } from "@/server/validators/pacientes";
import type { EventoAuditoria, GradoDeterioro, SexoPaciente } from "@/types/pacientes";

/** Nombre legible de cada campo que puede aparecer en la auditoría. */
const CAMPOS: Record<string, string> = {
  nombres: "Nombres",
  apellidos: "Apellidos",
  rut: "RUT",
  fecha_nacimiento: "Fecha de nacimiento",
  sexo: "Sexo",
  fecha_ingreso: "Fecha de ingreso",
  habitacion: "Habitación",
  fecha_egreso: "Fecha de egreso",
  alergias: "Alergias",
  prevision: "Previsión",
  medico_tratante: "Médico tratante",
  deterioro_cognitivo: "Deterioro cognitivo",
  deterioro_detalle: "Detalle del deterioro",
  observaciones: "Observaciones",
  contacto_nombre: "Contacto de emergencia",
  contacto_parentesco: "Parentesco del contacto",
  contacto_telefono: "Teléfono del contacto",
  codigo_qr: "Código QR",
  nombre: "Medicamento",
  dosis: "Dosis",
  indicaciones: "Indicaciones",
  situacional: "Situacional",
  motivo_situacional: "Cuándo se administra",
  horarios: "Horas",
  dias: "Días",
};

/** Valor legible: fechas, horas, días, enumeraciones; nunca muestra el código del QR. */
function valor(campo: string, dato: unknown): string {
  if (dato === null || dato === undefined || dato === "") return "(vacío)";
  if (campo === "codigo_qr") return "(código)";
  if (campo === "deterioro_cognitivo")
    return ETIQUETAS_DETERIORO[dato as GradoDeterioro] ?? String(dato);
  if (campo === "sexo") return ETIQUETAS_SEXO[dato as SexoPaciente] ?? String(dato);
  if (campo.startsWith("fecha_") && typeof dato === "string") return formatearFecha(dato);
  if (campo === "horarios" && Array.isArray(dato)) {
    return dato.length ? dato.map((h) => String(h).slice(0, 5)).join(", ") : "(ninguna)";
  }
  if (campo === "dias" && Array.isArray(dato)) return describirDias(dato.map(Number));
  if (typeof dato === "boolean") return dato ? "Sí" : "No";
  return String(dato);
}

const objeto = (dato: unknown) =>
  dato && typeof dato === "object" ? (dato as Record<string, unknown>) : {};

/** Qué pasó, en una frase. */
function titulo(evento: EventoAuditoria): string {
  const antes = objeto(evento.antes);
  const despues = objeto(evento.despues);
  const cambios = Object.keys(despues);
  const medicamento = evento.referencia ?? "";

  if (evento.accion === "consulta") return "Consultó la ficha";
  if (evento.tabla === "medicamentos") {
    if (evento.accion === "creacion")
      return `Agregó ${medicamento} (${String(despues.dosis ?? "")})`;
    if (evento.accion === "eliminacion")
      return `Quitó ${medicamento} (${String(antes.dosis ?? "")})`;
    return `Editó ${medicamento}`;
  }
  if (evento.accion === "creacion") return "Creó la ficha";
  if (evento.accion === "eliminacion") return "Eliminó la ficha";
  if (cambios.length === 1 && cambios[0] === "fecha_egreso") {
    return despues.fecha_egreso ? "Egresó al residente" : "Reingresó al residente";
  }
  if (cambios.length === 1 && cambios[0] === "codigo_qr") return "Generó un nuevo código QR";
  return "Editó la ficha";
}

const ICONOS = { consulta: Eye, creacion: FilePlus, edicion: Pencil, eliminacion: Trash2 } as const;

/**
 * Historial de una ficha: quién la consultó o cambió y cuándo, con el valor anterior
 * de cada campo modificado. Lo escribe la base de datos; aquí solo se lee.
 */
export function HistorialFicha({ eventos }: { eventos: EventoAuditoria[] }) {
  if (eventos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-6 text-center text-tinta-suave">
        Todavía no hay movimientos registrados.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {eventos.map((evento) => {
        const Icono = ICONOS[evento.accion as keyof typeof ICONOS] ?? Pencil;
        const antes = objeto(evento.antes);
        const despues = objeto(evento.despues);
        // En una edición se listan los campos cambiados (salvo los que ya describe el título).
        const cambios =
          evento.accion === "edicion"
            ? Object.keys(despues).filter((c) => c !== "fecha_egreso" && c !== "codigo_qr")
            : [];
        return (
          <li
            key={evento.id}
            className="flex gap-3 rounded-2xl border border-salvia-200 bg-white p-4"
          >
            <Icono className="mt-1 size-5 shrink-0 text-salvia-700" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold [overflow-wrap:anywhere]">{titulo(evento)}</p>
              <p className="text-base [overflow-wrap:anywhere] text-tinta-suave">
                {evento.usuario_email ?? "Directo en la base de datos"} ·{" "}
                <time dateTime={evento.fecha}>{formatearFechaHora(evento.fecha)}</time>
              </p>
              {cambios.length > 0 ? (
                <dl className="mt-2 space-y-1 text-base">
                  {cambios.map((campo) => (
                    <div key={campo} className="[overflow-wrap:anywhere]">
                      <dt className="inline font-semibold">{CAMPOS[campo] ?? campo}: </dt>
                      <dd className="inline">
                        <span className="text-tinta-suave line-through">
                          {valor(campo, antes[campo])}
                        </span>{" "}
                        → {valor(campo, despues[campo])}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
