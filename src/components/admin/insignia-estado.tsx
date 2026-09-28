import { cn } from "@/lib/utils/cn";
import { ETIQUETAS_ESTADO, type EstadoLead } from "@/server/validators/leads";

/** Contraste AA verificado para los tres pares texto/fondo. */
const ESTILOS: Record<EstadoLead, string> = {
  nuevo: "bg-terracota-claro text-terracota",
  contactado: "bg-salvia-100 text-salvia-800",
  descartado: "bg-stone-200 text-stone-700",
};

export function InsigniaEstado({ estado }: { estado: EstadoLead }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-base font-semibold",
        ESTILOS[estado],
      )}
    >
      {ETIQUETAS_ESTADO[estado].singular}
    </span>
  );
}
