import { DIAS_SEMANA, NOMBRES_DIAS } from "@/lib/utils/horario";

/** "miércoles" → "Mié" */
const abreviar = (dia: string) => dia.charAt(0).toUpperCase() + dia.slice(1, 3);

/**
 * Casillas de los días de la semana con aspecto de botón (Lun … Dom), cómodas en el
 * celular. Cada día marcado se envía como `${prefijo}${dia}` (ej: "dia_3" = miércoles).
 */
export function SelectorDias({
  prefijo,
  marcados,
}: {
  prefijo: string;
  marcados: readonly number[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DIAS_SEMANA.map((dia) => (
        <label key={dia} className="cursor-pointer">
          <input
            type="checkbox"
            name={`${prefijo}${dia}`}
            defaultChecked={marcados.includes(dia)}
            className="peer sr-only"
          />
          {/* Abreviatura visible; el lector de pantalla lee el nombre completo. */}
          <span className="flex min-h-11 min-w-12 items-center justify-center rounded-full border-2 border-salvia-300 bg-white px-3 font-semibold text-tinta-suave peer-checked:border-salvia-700 peer-checked:bg-salvia-700 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-salvia-700">
            <span aria-hidden="true">{abreviar(NOMBRES_DIAS[dia] ?? "")}</span>
            <span className="sr-only">{NOMBRES_DIAS[dia]}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
