/** Zona horaria del negocio: las fechas se muestran en hora de Chile continental. */
const ZONA_HORARIA = "America/Santiago";

const formatoFechaHora = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ZONA_HORARIA,
});

const formatoRelativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

const UNIDADES: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** Ej: "28 sept 2026, 14:30". */
export function formatearFechaHora(fecha: string | Date): string {
  return formatoFechaHora.format(new Date(fecha));
}

/** Ej: "hace 3 horas", "ayer", "hace 2 semanas". */
export function tiempoRelativo(fecha: string | Date, ahora: Date = new Date()): string {
  const segundos = (new Date(fecha).getTime() - ahora.getTime()) / 1000;
  for (const [unidad, duracion] of UNIDADES) {
    if (Math.abs(segundos) >= duracion) {
      return formatoRelativo.format(Math.round(segundos / duracion), unidad);
    }
  }
  return "hace un momento";
}
