import { Check, X } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import { horaDesdeRegistrable, type DosisProgramada, type EstadoDosis } from "@/lib/utils/dosis";
import { formatearHora } from "@/lib/utils/fechas";
import { diasDelMedicamento } from "@/lib/utils/medicamentos";
import { ETIQUETAS_MOTIVO_OMISION } from "@/server/validators/dosis";

import { AccionesDosis } from "./acciones-dosis";

/** Contraste AA en todos los pares; lo urgente, en tonos cálidos. */
const ESTADOS: Record<Exclude<EstadoDosis, "registrada">, { texto: string; clase: string }> = {
  atrasada: { texto: "Atrasada", clase: "bg-terracota text-white" },
  ahora: { texto: "Toca ahora", clase: "bg-amber-100 text-amber-900" },
  pendiente: { texto: "Más tarde", clase: "bg-stone-200 text-stone-700" },
};

function Insignia({ texto, clase }: { texto: string; clase: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-0.5 text-base font-semibold", clase)}>
      {texto}
    </span>
  );
}

/**
 * Una dosis programada: hora, medicamento, estado y, según corresponda, quién la
 * registró o los botones para registrarla. En la ronda también muestra al residente.
 */
export function FilaDosis({
  dosis,
  residente,
  mostrarHora = true,
}: {
  dosis: DosisProgramada;
  residente?: { id: string; nombre: string; habitacion: string };
  /** false cuando la hora ya está en el título del grupo (ronda). */
  mostrarHora?: boolean;
}) {
  const { medicamento, registro } = dosis;
  const detalles = [diasDelMedicamento(medicamento.dias), medicamento.indicaciones].filter(Boolean);
  const descripcion = `${medicamento.nombre} de las ${dosis.hora}${residente ? ` para ${residente.nombre}` : ""}`;

  return (
    <div className="flex gap-3 sm:gap-4">
      <div className={cn("w-16 shrink-0", !mostrarHora && "hidden")}>
        <time
          dateTime={`${dosis.fecha}T${dosis.hora}`}
          className="block font-serif text-xl font-semibold text-salvia-800 tabular-nums"
        >
          {dosis.hora}
        </time>
        {dosis.esDeAyer ? <span className="text-base text-tinta-suave">anoche</span> : null}
      </div>

      <div className="min-w-0 flex-1">
        {residente ? (
          <Link
            href={`/admin/pacientes/${residente.id}`}
            className="font-semibold [overflow-wrap:anywhere] text-salvia-800 underline-offset-4 hover:underline"
          >
            {residente.nombre}
            {residente.habitacion ? (
              <span className="font-normal text-tinta-suave"> · Hab. {residente.habitacion}</span>
            ) : null}
          </Link>
        ) : null}
        <p className="[overflow-wrap:anywhere]">
          <span className="font-semibold">{medicamento.nombre}</span>
          <span className="text-tinta-suave"> — {medicamento.dosis}</span>
        </p>
        {detalles.length > 0 ? (
          <p className="text-base [overflow-wrap:anywhere] text-tinta-suave">
            {detalles.join(" · ")}
          </p>
        ) : null}

        <div className="mt-2">
          {registro ? (
            <p className="flex gap-2 text-base [overflow-wrap:anywhere]">
              {registro.resultado === "administrada" ? (
                <Check className="mt-0.5 size-5 shrink-0 text-salvia-700" aria-hidden="true" />
              ) : (
                <X className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
              )}
              <span>
                <span className="font-semibold">
                  {registro.resultado === "administrada"
                    ? "Dada"
                    : `No se dio: ${registro.motivo_omision ? ETIQUETAS_MOTIVO_OMISION[registro.motivo_omision].toLowerCase() : ""}`}
                </span>
                {" · "}
                {formatearHora(registro.registrado_en)}
                {registro.registrado_email ? ` · ${registro.registrado_email}` : null}
                {registro.observacion ? (
                  <span className="block text-tinta-suave">{registro.observacion}</span>
                ) : null}
              </span>
            </p>
          ) : (
            <>
              <Insignia {...ESTADOS[dosis.estado as Exclude<EstadoDosis, "registrada">]} />
              {dosis.registrable ? (
                <AccionesDosis
                  medicamentoId={medicamento.id}
                  fecha={dosis.fecha}
                  hora={dosis.hora}
                  descripcion={descripcion}
                />
              ) : (
                <p className="mt-1 text-base text-tinta-suave">
                  Se podrá registrar desde las {horaDesdeRegistrable(dosis.hora)}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
