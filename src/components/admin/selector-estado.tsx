"use client";

import { useOptimistic, useState, useTransition } from "react";

import { cn } from "@/lib/utils/cn";
import { cambiarEstadoLeadAccion } from "@/server/actions/leads";
import { ESTADOS_LEAD, ETIQUETAS_ESTADO, type EstadoLead } from "@/server/validators/leads";

type Props = { id: string; estado: EstadoLead; nombre: string };

/**
 * Cambio de estado de un contacto con actualización optimista: el botón elegido se
 * marca al instante (importante con mala conexión en el celular) y, si el servidor
 * rechaza el cambio, vuelve al estado anterior y se muestra un aviso.
 */
export function SelectorEstado({ id, estado, nombre }: Props) {
  const [estadoVisible, setEstadoOptimista] = useOptimistic(estado);
  const [guardando, iniciarTransicion] = useTransition();
  const [error, setError] = useState(false);

  function cambiar(nuevo: EstadoLead) {
    if (nuevo === estadoVisible || guardando) return;
    setError(false);
    iniciarTransicion(async () => {
      setEstadoOptimista(nuevo);
      const { ok } = await cambiarEstadoLeadAccion(id, nuevo);
      if (!ok) setError(true);
    });
  }

  return (
    <fieldset className="mt-5">
      <legend className="mb-2 font-semibold">
        Estado<span className="sr-only"> del contacto de {nombre}</span>
      </legend>
      {/* Cada botón toma el ancho de su texto y se reparte el sobrante; en pantallas
          muy angostas pasan a otra línea en vez de desbordarse. */}
      <div className="flex flex-wrap gap-1.5 sm:max-w-lg">
        {ESTADOS_LEAD.map((opcion) => {
          const activo = estadoVisible === opcion;
          return (
            <button
              key={opcion}
              type="button"
              aria-pressed={activo}
              aria-disabled={guardando || undefined}
              onClick={() => cambiar(opcion)}
              className={cn(
                "min-h-11 flex-auto rounded-xl border-2 px-2 text-base font-semibold whitespace-nowrap transition-colors",
                activo
                  ? "border-salvia-700 bg-salvia-700 text-white"
                  : "border-salvia-300 bg-white text-tinta hover:bg-salvia-50",
                guardando && "cursor-wait",
              )}
            >
              {ETIQUETAS_ESTADO[opcion].singular}
            </button>
          );
        })}
      </div>
      {/* aria-live: anuncia "Guardando…" y los errores a lectores de pantalla. */}
      <p aria-live="polite" className="mt-2 min-h-6 text-base">
        {guardando ? (
          <span className="text-tinta-suave">Guardando…</span>
        ) : error ? (
          <span className="font-semibold text-terracota">
            No se pudo guardar el cambio. Inténtalo de nuevo.
          </span>
        ) : null}
      </p>
    </fieldset>
  );
}
