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

const formatoFecha = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "long",
  timeZone: "UTC", // las fechas sin hora ("AAAA-MM-DD") se guardan como medianoche UTC
});

// "en-CA" formatea como AAAA-MM-DD, el mismo formato de <input type="date"> y de Postgres.
const formatoIso = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA });

const formatoMomento = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Un instante expresado en la hora local de Chile. `minutos` permite restar momentos
 * locales entre sí (cuenta los minutos como si la hora local fuera UTC).
 */
export type MomentoLocal = { fecha: string; hora: string; minutos: number };

/** Minutos de una fecha y hora locales ("AAAA-MM-DD", "HH:MM"), para comparar y restar. */
export function minutosLocales(fecha: string, hora: string): number {
  const [anio = 0, mes = 1, dia = 1] = fecha.split("-").map(Number);
  const [h = 0, m = 0] = hora.split(":").map(Number);
  return Date.UTC(anio, mes - 1, dia, h, m) / 60000;
}

/** Ahora mismo en Chile (no la hora del servidor, que suele estar en UTC). */
export function ahoraEnChile(ahora: Date = new Date()): MomentoLocal {
  const partes = Object.fromEntries(
    formatoMomento.formatToParts(ahora).map((p) => [p.type, p.value]),
  );
  const fecha = `${partes.year}-${partes.month}-${partes.day}`;
  const hora = `${partes.hour}:${partes.minute}`;
  return { fecha, hora, minutos: minutosLocales(fecha, hora) };
}

/** "2026-03-01" → "2026-02-28". */
export function diaAnterior(fecha: string): string {
  const [anio = 0, mes = 1, dia = 1] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia - 1)).toISOString().slice(0, 10);
}

/** Día de la semana ISO 8601 (1 = lunes … 7 = domingo) de "AAAA-MM-DD". */
export function diaSemanaIso(fecha: string): number {
  const [anio = 0, mes = 1, dia = 1] = fecha.split("-").map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Fecha de hoy en Chile, "AAAA-MM-DD" (no la del servidor, que suele estar en UTC). */
export function hoyEnChile(ahora: Date = new Date()): string {
  return formatoIso.format(ahora);
}

/** Ej: "12 de abril de 1938". Recibe una fecha sin hora ("AAAA-MM-DD"). */
export function formatearFecha(fecha: string): string {
  return formatoFecha.format(new Date(`${fecha}T00:00:00Z`));
}

/** Años cumplidos a la fecha de hoy en Chile. Recibe "AAAA-MM-DD". */
export function calcularEdad(fechaNacimiento: string, ahora: Date = new Date()): number {
  const [anio, mes, dia] = fechaNacimiento.split("-").map(Number);
  const [anioHoy, mesHoy, diaHoy] = hoyEnChile(ahora).split("-").map(Number);
  if (!anio || !mes || !dia || !anioHoy || !mesHoy || !diaHoy) return 0;
  const cumplioEsteAnio = mesHoy > mes || (mesHoy === mes && diaHoy >= dia);
  return anioHoy - anio - (cumplioEsteAnio ? 0 : 1);
}

const formatoHora = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: ZONA_HORARIA,
});

/** Ej: "08:05" (hora de Chile). */
export function formatearHora(fecha: string | Date): string {
  return formatoHora.format(new Date(fecha));
}

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
