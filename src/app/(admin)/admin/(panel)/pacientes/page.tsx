import { ListChecks, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FiltroPacientes } from "@/components/admin/pacientes/filtro-pacientes";
import { TarjetaPaciente } from "@/components/admin/pacientes/tarjeta-paciente";
import { clasesBoton } from "@/components/ui/boton";
import { cn } from "@/lib/utils/cn";
import {
  obtenerListadoPacientes,
  puedeEditarFichas,
  requerirVerFichas,
} from "@/server/services/pacientes";

export const metadata: Metadata = { title: "Pacientes" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function Pestana({ href, activa, children }: { href: string; activa: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={activa ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center rounded-full border-2 px-4 text-base font-semibold whitespace-nowrap",
        activa
          ? "border-salvia-700 bg-salvia-700 text-white"
          : "border-salvia-300 bg-white text-tinta hover:bg-salvia-50",
      )}
    >
      {children}
    </Link>
  );
}

/** Listado de residentes (activos o egresados) con buscador. */
export default async function PacientesPage({ searchParams }: Props) {
  const admin = await requerirVerFichas({ volverA: "/admin/pacientes" });
  const egresados = (await searchParams).estado === "egresados";
  const pacientes = await obtenerListadoPacientes(egresados);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Pacientes</h1>
          <p className="mt-1 text-tinta-suave">
            {egresados
              ? "Residentes egresados: sus fichas se conservan."
              : "Residentes activos. Toca uno para ver su ficha."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/pacientes/ronda" className={clasesBoton()}>
            <ListChecks className="size-5" aria-hidden="true" />
            Ronda de medicamentos
          </Link>
          {puedeEditarFichas(admin) ? (
            <Link href="/admin/pacientes/nuevo" className={clasesBoton({ variante: "secundario" })}>
              <UserPlus className="size-5" aria-hidden="true" />
              Nuevo paciente
            </Link>
          ) : null}
        </div>
      </header>

      <nav aria-label="Filtrar pacientes" className="flex gap-2">
        <Pestana href="/admin/pacientes" activa={!egresados}>
          Activos
        </Pestana>
        <Pestana href="/admin/pacientes?estado=egresados" activa={egresados}>
          Egresados
        </Pestana>
      </nav>

      {pacientes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-6 text-center text-tinta-suave">
          {egresados ? "No hay residentes egresados." : "Todavía no hay fichas de residentes."}
        </p>
      ) : (
        <FiltroPacientes
          elementos={pacientes.map((p) => ({
            id: p.id,
            textoBusqueda: `${p.nombres} ${p.apellidos} ${p.habitacion}`,
            contenido: <TarjetaPaciente paciente={p} />,
          }))}
        />
      )}
    </div>
  );
}
