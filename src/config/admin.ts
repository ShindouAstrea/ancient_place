import type { Database } from "@/types/database";

/**
 * Módulos del panel de administración: única fuente de la navegación.
 *
 * Cada módulo exige un rol:
 * - "sitio": contenido del sitio web y contactos del formulario.
 * - "pacientes": módulos con datos de residentes (datos de salud, sensibles).
 *
 * Para habilitar un módulo futuro: crear su página en
 * src/app/(admin)/admin/(panel)/<ruta>/page.tsx (protegida con requerirRol) y cambiar
 * `disponible` a true. Aparecerá en el menú de quienes tengan su rol.
 */

export type RolAdmin = Database["public"]["Enums"]["rol_admin"];

export const NOMBRES_ROL: Record<RolAdmin, string> = {
  sitio: "Sitio web y contactos",
  pacientes: "Pacientes",
};

/** Íconos disponibles para el panel. Para agregar uno, súmalo en components/admin/icono-admin.tsx. */
export type NombreIconoAdmin =
  "House" | "Inbox" | "Globe" | "CalendarDays" | "Package" | "ClipboardList" | "CircleUser";

export type ModuloAdmin = {
  nombre: string;
  /** Nombre corto para la barra inferior del celular. */
  nombreCorto: string;
  descripcion: string;
  href: string;
  icono: NombreIconoAdmin;
  rol: RolAdmin;
  disponible: boolean;
};

export const modulosAdmin = [
  {
    nombre: "Contactos",
    nombreCorto: "Contactos",
    descripcion: "Solicitudes de información recibidas desde el sitio web.",
    href: "/admin/leads",
    icono: "Inbox",
    rol: "sitio",
    disponible: true,
  },
  {
    nombre: "Sitio web",
    nombreCorto: "Sitio",
    descripcion: "Nombre, contacto, fotos, servicios, testimonios y preguntas del sitio.",
    href: "/admin/sitio",
    icono: "Globe",
    rol: "sitio",
    disponible: true,
  },
  {
    nombre: "Agenda",
    nombreCorto: "Agenda",
    descripcion: "Visitas de familias, citas y actividades.",
    href: "/admin/agenda",
    icono: "CalendarDays",
    rol: "pacientes",
    disponible: false,
  },
  {
    nombre: "Inventario",
    nombreCorto: "Inventario",
    descripcion: "Insumos, medicamentos y materiales.",
    href: "/admin/inventario",
    icono: "Package",
    rol: "pacientes",
    disponible: false,
  },
  {
    nombre: "Pacientes",
    nombreCorto: "Pacientes",
    descripcion: "Fichas y documentación de residentes.",
    href: "/admin/pacientes",
    icono: "ClipboardList",
    rol: "pacientes",
    disponible: false,
  },
] as const satisfies readonly ModuloAdmin[];

export type ElementoNavegacion = Pick<ModuloAdmin, "nombre" | "nombreCorto" | "href" | "icono">;

/** Módulos que corresponden a los roles de una persona. */
export function modulosPara(roles: readonly RolAdmin[]): readonly ModuloAdmin[] {
  return modulosAdmin.filter((m) => roles.includes(m.rol));
}

/** Menú: inicio + módulos disponibles para sus roles + su cuenta. */
export function navegacionPara(roles: readonly RolAdmin[]): ElementoNavegacion[] {
  return [
    { nombre: "Inicio", nombreCorto: "Inicio", href: "/admin", icono: "House" },
    ...modulosPara(roles).filter((m) => m.disponible),
    { nombre: "Mi cuenta", nombreCorto: "Cuenta", href: "/admin/cuenta", icono: "CircleUser" },
  ];
}
