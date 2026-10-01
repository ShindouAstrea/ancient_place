import { Brain } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { ETIQUETAS_DETERIORO } from "@/server/validators/pacientes";
import type { GradoDeterioro } from "@/types/pacientes";

/** Del más neutro al más cálido según el grado. Contraste AA en todos los pares. */
const ESTILOS: Record<GradoDeterioro, string> = {
  no_evaluado: "bg-stone-200 text-stone-700",
  sin_deterioro: "bg-salvia-100 text-salvia-800",
  leve: "bg-amber-100 text-amber-900",
  moderado: "bg-terracota-claro text-terracota",
  severo: "bg-terracota text-white",
};

export function InsigniaDeterioro({ grado }: { grado: GradoDeterioro }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-semibold",
        ESTILOS[grado],
      )}
    >
      <Brain className="size-4 shrink-0" aria-hidden="true" />
      Deterioro cognitivo: {ETIQUETAS_DETERIORO[grado].toLowerCase()}
    </span>
  );
}
