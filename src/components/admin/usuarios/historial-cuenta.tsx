import { KeyRound, Pencil, UserCheck, UserPlus, UserX, type LucideIcon } from "lucide-react";

import { NOMBRES_ROL, type RolAdmin } from "@/config/admin";
import { formatearFechaHora } from "@/lib/utils/fechas";
import type { EventoCuenta } from "@/server/services/usuarios";

const ICONOS: Record<string, LucideIcon> = {
  creacion: UserPlus,
  edicion: Pencil,
  desactivacion: UserX,
  reactivacion: UserCheck,
  contrasena_temporal: KeyRound,
};

const objeto = (dato: unknown) =>
  dato && typeof dato === "object" ? (dato as Record<string, unknown>) : {};

function permisos(dato: unknown): string {
  if (!Array.isArray(dato) || dato.length === 0) return "ninguno";
  return dato.map((r) => NOMBRES_ROL[r as RolAdmin] ?? String(r)).join(", ");
}

/** Qué pasó, en frases cortas (una edición puede cambiar el nombre y los permisos). */
function descripcion(evento: EventoCuenta): string[] {
  const antes = objeto(evento.antes);
  const despues = objeto(evento.despues);
  switch (evento.accion) {
    case "creacion":
      return [`Creó la cuenta. Permisos: ${permisos(despues.roles)}.`];
    case "desactivacion":
      return ["Desactivó la cuenta."];
    case "reactivacion":
      return ["Reactivó la cuenta."];
    case "contrasena_temporal":
      return ["Le dio una contraseña temporal."];
    default: {
      const frases: string[] = [];
      if ("nombre" in despues) {
        frases.push(
          `Cambió el nombre: «${String(antes.nombre ?? "")}» → «${String(despues.nombre)}».`,
        );
      }
      if ("roles" in despues) {
        frases.push(`Cambió los permisos: ${permisos(antes.roles)} → ${permisos(despues.roles)}.`);
      }
      return frases.length ? frases : ["Editó la cuenta."];
    }
  }
}

/** Historial de cambios de una cuenta: quién hizo qué y cuándo. */
export function HistorialCuenta({ eventos }: { eventos: EventoCuenta[] }) {
  if (eventos.length === 0) {
    return (
      <p className="text-base text-tinta-suave">
        Sin cambios registrados desde el panel (la cuenta se creó antes o directo en la base de
        datos).
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {eventos.map((evento) => {
        const Icono = ICONOS[evento.accion] ?? Pencil;
        return (
          <li
            key={evento.id}
            className="flex gap-3 rounded-2xl border border-salvia-200 bg-white p-4"
          >
            <Icono className="mt-0.5 size-5 shrink-0 text-salvia-700" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              {descripcion(evento).map((frase) => (
                <p key={frase} className="font-semibold [overflow-wrap:anywhere]">
                  {frase}
                </p>
              ))}
              <p className="text-base [overflow-wrap:anywhere] text-tinta-suave">
                {formatearFechaHora(evento.fecha)} ·{" "}
                {evento.usuario_email ?? "directo en la base de datos"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
