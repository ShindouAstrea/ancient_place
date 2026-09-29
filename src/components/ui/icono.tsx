import {
  Activity,
  BedDouble,
  Clock,
  Flower2,
  HeartHandshake,
  HeartPulse,
  House,
  Leaf,
  Music,
  Palette,
  Pill,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  Sun,
  Users,
  Utensils,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

import { esNombreIcono, type NombreIcono } from "@/config/iconos";

/**
 * Mapa explícito de íconos: importar solo los usados mantiene el bundle pequeño
 * (importar lucide-react completo por nombre dinámico incluiría cientos de íconos).
 */
const iconos: Record<NombreIcono, LucideIcon> = {
  Activity,
  BedDouble,
  Clock,
  Flower2,
  HeartHandshake,
  HeartPulse,
  House,
  Leaf,
  Music,
  Palette,
  Pill,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  Sun,
  Users,
  Utensils,
};

/** Ícono decorativo por nombre. Un nombre desconocido muestra el ícono por defecto. */
export function Icono({ nombre, ...props }: LucideProps & { nombre: string }) {
  const Componente = iconos[esNombreIcono(nombre) ? nombre : "HeartHandshake"];
  return <Componente aria-hidden="true" focusable="false" {...props} />;
}
