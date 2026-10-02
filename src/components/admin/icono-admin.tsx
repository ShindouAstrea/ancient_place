import {
  CalendarDays,
  CircleUser,
  ClipboardList,
  Globe,
  House,
  Inbox,
  Package,
  UsersRound,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

import type { NombreIconoAdmin } from "@/config/admin";

/** Mapa explícito: solo se incluyen en el bundle los íconos que se usan. */
const iconos: Record<NombreIconoAdmin, LucideIcon> = {
  CalendarDays,
  CircleUser,
  ClipboardList,
  Globe,
  House,
  Inbox,
  Package,
  UsersRound,
};

/** Ícono decorativo de un módulo del panel (definido por nombre en config/admin.ts). */
export function IconoAdmin({ nombre, ...props }: LucideProps & { nombre: NombreIconoAdmin }) {
  const Componente = iconos[nombre];
  return <Componente aria-hidden="true" focusable="false" {...props} />;
}
