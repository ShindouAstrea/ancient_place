/**
 * Íconos que se pueden elegir desde el panel para servicios y "Por qué elegirnos".
 * La clave es el nombre del ícono de lucide-react; el valor, su descripción en el panel.
 * Para agregar uno: sumarlo aquí y en el mapa de components/ui/icono.tsx.
 */
export const ICONOS = {
  HeartHandshake: "Manos y corazón (cuidado)",
  Stethoscope: "Estetoscopio (salud)",
  HeartPulse: "Corazón con pulso",
  Pill: "Medicamentos",
  Activity: "Actividad (kinesiología)",
  Utensils: "Cubiertos (alimentación)",
  BedDouble: "Cama (descanso)",
  Palette: "Paleta (talleres)",
  Music: "Música",
  Flower2: "Flor (jardín)",
  Sun: "Sol",
  Leaf: "Hoja",
  House: "Casa",
  Users: "Personas (equipo)",
  ShieldCheck: "Escudo (seguridad)",
  Clock: "Reloj (horarios)",
  Smile: "Sonrisa",
  Sparkles: "Destellos",
} as const;

export type NombreIcono = keyof typeof ICONOS;

export const NOMBRES_ICONOS = Object.keys(ICONOS) as [NombreIcono, ...NombreIcono[]];

export function esNombreIcono(valor: string): valor is NombreIcono {
  return valor in ICONOS;
}
