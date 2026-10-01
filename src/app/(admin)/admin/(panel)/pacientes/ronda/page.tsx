import type { Metadata } from "next";
import Link from "next/link";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { FilaDosis } from "@/components/admin/pacientes/fila-dosis";
import { cn } from "@/lib/utils/cn";
import { formatearFecha } from "@/lib/utils/fechas";
import { obtenerRonda, type DosisRonda } from "@/server/services/dosis";

export const metadata: Metadata = { title: "Ronda de medicamentos" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function Filtro({ href, activo, children }: { href: string; activo: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center rounded-full border-2 px-4 text-base font-semibold whitespace-nowrap",
        activo
          ? "border-salvia-700 bg-salvia-700 text-white"
          : "border-salvia-300 bg-white text-tinta hover:bg-salvia-50",
      )}
    >
      {children}
    </Link>
  );
}

function Grupo({
  id,
  titulo,
  dosis,
  mostrarHora,
}: {
  id: string;
  titulo: string;
  dosis: DosisRonda[];
  /** En los grupos por hora, la hora ya está en el título. */
  mostrarHora: boolean;
}) {
  return (
    <section aria-labelledby={`grupo-${id}`}>
      <h2 id={`grupo-${id}`} className="text-2xl font-semibold">
        {titulo}
      </h2>
      <ol className="mt-3 divide-y divide-salvia-100 rounded-2xl border border-salvia-200 bg-white">
        {dosis.map((d) => (
          <li key={d.clave} className="p-4">
            <FilaDosis dosis={d} residente={d.residente} mostrarHora={mostrarHora} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Ronda: las dosis de hoy de todos los residentes activos, por hora, con las atrasadas
 * primero. Para recorrerlas en orden y registrarlas sin abrir cada ficha.
 */
export default async function RondaPage({ searchParams }: Props) {
  const { ahora, dosis } = await obtenerRonda();
  const todas = (await searchParams).ver === "todas";

  const atrasadas = dosis.filter((d) => d.estado === "atrasada");
  const ahoraMismo = dosis.filter((d) => d.estado === "ahora").length;
  const registradas = dosis.filter((d) => d.estado === "registrada").length;
  const resto = dosis.filter(
    (d) => d.estado !== "atrasada" && (todas || d.estado !== "registrada"),
  );

  // Agrupa por hora (las de anoche quedan separadas de las de hoy a la misma hora).
  const porHora = new Map<string, DosisRonda[]>();
  for (const d of resto) {
    const clave = `${d.esDeAyer ? "anoche " : ""}${d.hora}`;
    porHora.set(clave, [...(porHora.get(clave) ?? []), d]);
  }

  return (
    <div className="space-y-6">
      <div>
        <EnlaceVolver href="/admin/pacientes">Pacientes</EnlaceVolver>
        <h1 className="text-3xl font-semibold">Ronda de medicamentos</h1>
        <p className="mt-1 text-tinta-suave">
          Hoy, {formatearFecha(ahora.fecha)}, {ahora.hora} (hora de Chile). Toca el nombre de un
          residente para abrir su ficha.
        </p>
      </div>

      <ul className="grid grid-cols-3 gap-2" aria-label="Resumen del día">
        <li
          className={cn(
            "rounded-2xl border bg-white p-3",
            atrasadas.length > 0 ? "border-terracota" : "border-salvia-200",
          )}
        >
          <span className="block font-serif text-2xl font-semibold">{atrasadas.length}</span>
          <span className="text-base text-tinta-suave">Atrasadas</span>
        </li>
        <li className="rounded-2xl border border-salvia-200 bg-white p-3">
          <span className="block font-serif text-2xl font-semibold">{ahoraMismo}</span>
          <span className="text-base text-tinta-suave">Toca ahora</span>
        </li>
        <li className="rounded-2xl border border-salvia-200 bg-white p-3">
          <span className="block font-serif text-2xl font-semibold">
            {registradas}/{dosis.length}
          </span>
          <span className="text-base text-tinta-suave">Registradas</span>
        </li>
      </ul>

      <nav aria-label="Qué dosis mostrar" className="flex gap-2">
        <Filtro href="/admin/pacientes/ronda" activo={!todas}>
          Por registrar
        </Filtro>
        <Filtro href="/admin/pacientes/ronda?ver=todas" activo={todas}>
          Todas
        </Filtro>
      </nav>

      {dosis.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-6 text-center text-tinta-suave">
          Hoy no hay dosis programadas.
        </p>
      ) : atrasadas.length === 0 && porHora.size === 0 ? (
        <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-6 text-center text-tinta-suave">
          Todas las dosis de hoy están registradas.
        </p>
      ) : null}

      {atrasadas.length > 0 ? (
        <Grupo id="atrasadas" titulo="Atrasadas" dosis={atrasadas} mostrarHora />
      ) : null}
      {[...porHora.entries()].map(([hora, lista]) => (
        <Grupo
          key={hora}
          id={hora.replace(/\W/g, "")}
          titulo={hora.replace(/^anoche /, "Anoche, ")}
          dosis={lista}
          mostrarHora={false}
        />
      ))}
    </div>
  );
}
