/** Días de la semana según ISO 8601 (1 = lunes … 7 = domingo). */
export const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7] as const;

/** Hora "HH:MM" en formato 24 h (la base de datos lo exige igual). */
export const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const NOMBRES_DIAS: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
};

/** Nombres que entiende schema.org (datos estructurados para buscadores). */
export const DIAS_SCHEMA: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

/** "a, b y c" */
function enumerar(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
}

/**
 * Días en lenguaje natural, agrupando los consecutivos:
 * [1..5] → "Lunes a viernes"; [6, 7] → "Sábado y domingo"; [1, 3, 5] → "Lunes, miércoles
 * y viernes"; [1, 2, 3, 5] → "Lunes a miércoles y viernes"; los 7 → "Todos los días".
 */
export function describirDias(dias: readonly number[]): string {
  const ordenados = [...new Set(dias)].sort((a, b) => a - b);
  if (ordenados.length === 7) return "Todos los días";

  // Tramos de días consecutivos: [[1, 2, 3], [5]].
  const grupos: number[][] = [];
  for (const dia of ordenados) {
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.at(-1) === dia - 1) ultimo.push(dia);
    else grupos.push([dia]);
  }

  const partes = grupos.flatMap((grupo) => {
    const nombres = grupo.map((d) => NOMBRES_DIAS[d] ?? "");
    // Tres o más días seguidos: "lunes a viernes"; dos: "sábado", "domingo".
    return grupo.length >= 3 ? [`${nombres[0]} a ${nombres.at(-1)}`] : nombres;
  });
  const texto = enumerar(partes);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
