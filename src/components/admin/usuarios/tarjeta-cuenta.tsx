import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { NOMBRES_ROL } from "@/config/admin";
import { tiempoRelativo } from "@/lib/utils/fechas";
import type { Cuenta } from "@/server/services/usuarios";

/** Estado de una cuenta en insignias: desactivada, contraseña temporal pendiente, propia. */
export function InsigniasCuenta({ cuenta, propia }: { cuenta: Cuenta; propia: boolean }) {
  return (
    <span className="flex flex-wrap gap-2">
      {propia ? (
        <span className="inline-flex items-center rounded-full bg-salvia-100 px-3 py-1 text-base font-semibold text-salvia-800">
          Tu cuenta
        </span>
      ) : null}
      {!cuenta.activa ? (
        <span className="inline-flex items-center rounded-full bg-stone-200 px-3 py-1 text-base font-semibold text-stone-700">
          Desactivada
        </span>
      ) : cuenta.contrasenaTemporal ? (
        <span className="inline-flex items-center rounded-full bg-terracota-claro px-3 py-1 text-base font-semibold text-terracota">
          Contraseña temporal
        </span>
      ) : null}
    </span>
  );
}

/** Último ingreso, en palabras ("hace 3 días") o "Nunca ha ingresado". */
export function textoUltimoIngreso(cuenta: Cuenta): string {
  return cuenta.ultimoIngreso
    ? `Último ingreso: ${tiempoRelativo(cuenta.ultimoIngreso)}`
    : "Nunca ha ingresado";
}

/** Tarjeta del listado de usuarios: toda la tarjeta abre la cuenta. */
export function TarjetaCuenta({ cuenta, propia }: { cuenta: Cuenta; propia: boolean }) {
  return (
    <Link
      href={`/admin/usuarios/${cuenta.id}`}
      className="flex items-center gap-3 rounded-2xl border border-salvia-200 bg-white p-4 shadow-sm hover:border-salvia-700 sm:p-5"
    >
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block text-xl font-semibold [overflow-wrap:anywhere]">
          {cuenta.nombre || cuenta.email}
        </span>
        {cuenta.nombre ? (
          <span className="block text-base [overflow-wrap:anywhere] text-tinta-suave">
            {cuenta.email}
          </span>
        ) : null}
        <span className="block text-base">
          {cuenta.roles.length > 0
            ? cuenta.roles.map((r) => NOMBRES_ROL[r]).join(" · ")
            : "Sin permisos"}
        </span>
        <span className="block text-base text-tinta-suave">{textoUltimoIngreso(cuenta)}</span>
        <span className="block pt-1">
          <InsigniasCuenta cuenta={cuenta} propia={propia} />
        </span>
      </span>
      <ChevronRight className="size-6 shrink-0 text-salvia-700" aria-hidden="true" />
    </Link>
  );
}
