import {
  Activity,
  HeartHandshake,
  HeartPulse,
  House,
  Leaf,
  Palette,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Users,
  Utensils,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

import type { NombreIcono } from "@/config/site";

/**
 * Mapa explícito de íconos: importar solo los usados mantiene el bundle pequeño
 * (importar lucide-react completo por nombre dinámico incluiría cientos de íconos).
 */
const iconos: Record<NombreIcono, LucideIcon> = {
  Activity,
  HeartHandshake,
  HeartPulse,
  House,
  Leaf,
  Palette,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  Users,
  Utensils,
};

/** Ícono decorativo definido por nombre en site.ts. */
export function Icono({ nombre, ...props }: LucideProps & { nombre: NombreIcono }) {
  const Componente = iconos[nombre];
  return <Componente aria-hidden="true" focusable="false" {...props} />;
}
