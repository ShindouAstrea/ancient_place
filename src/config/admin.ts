/**
 * Módulos del panel de administración: única fuente de la navegación.
 *
 * Para habilitar un módulo futuro: crear su página en
 * src/app/(admin)/admin/(panel)/<ruta>/page.tsx y cambiar `disponible` a true.
 * Aparecerá automáticamente en el menú y en la página de inicio del panel.
 */

/** Íconos disponibles para el panel. Para agregar uno, súmalo en components/admin/icono-admin.tsx. */
export type NombreIconoAdmin =
  "House" | "Inbox" | "CalendarDays" | "Package" | "ClipboardList" | "CircleUser";

export type ModuloAdmin = {
  nombre: string;
  descripcion: string;
  href: string;
  icono: NombreIconoAdmin;
  disponible: boolean;
};

export const modulosAdmin = [
  {
    nombre: "Contactos",
    descripcion: "Solicitudes de información recibidas desde el sitio web.",
    href: "/admin/leads",
    icono: "Inbox",
    disponible: true,
  },
  {
    nombre: "Agenda",
    descripcion: "Visitas de familias, citas y actividades.",
    href: "/admin/agenda",
    icono: "CalendarDays",
    disponible: false,
  },
  {
    nombre: "Inventario",
    descripcion: "Insumos, medicamentos y materiales.",
    href: "/admin/inventario",
    icono: "Package",
    disponible: false,
  },
  {
    nombre: "Pacientes",
    descripcion: "Fichas y documentación de residentes.",
    href: "/admin/pacientes",
    icono: "ClipboardList",
    disponible: false,
  },
] as const satisfies readonly ModuloAdmin[];

/** Elementos del menú: inicio del panel + módulos disponibles + la cuenta del usuario. */
export const navegacionAdmin: readonly Pick<ModuloAdmin, "nombre" | "href" | "icono">[] = [
  { nombre: "Inicio", href: "/admin", icono: "House" },
  ...modulosAdmin.filter((m) => m.disponible),
  { nombre: "Mi cuenta", href: "/admin/cuenta", icono: "CircleUser" },
];
