import type { Database } from "@/types/database";

/**
 * Módulos del panel de administración: única fuente de la navegación.
 *
 * Cada módulo exige alguno de sus roles:
 * - "sitio": contenido del sitio web y contactos del formulario.
 * - "pacientes": fichas de residentes (datos de salud, sensibles): ver y editar.
 * - "pacientes_lectura": fichas de residentes: ver y registrar dosis (no editar).
 * - "usuarios": cuentas del panel: crearlas, asignar roles, desactivarlas.
 *
 * Para habilitar un módulo futuro: crear su página en
 * src/app/(admin)/admin/(panel)/<ruta>/page.tsx (protegida con requerirRol) y cambiar
 * `disponible` a true. Aparecerá en el menú de quienes tengan su rol.
 */

export type RolAdmin = Database["public"]["Enums"]["rol_admin"];

export const NOMBRES_ROL: Record<RolAdmin, string> = {
  sitio: "Sitio web y contactos",
  pacientes: "Fichas de pacientes (ver y editar)",
  pacientes_lectura: "Fichas de pacientes (ver y registrar dosis)",
  usuarios: "Usuarios y permisos",
};

/** Qué permite cada rol, en palabras simples (formulario de cuentas). */
export const DESCRIPCIONES_ROL: Record<RolAdmin, string> = {
  sitio: "Edita el contenido del sitio web y ve los contactos que llegan por el formulario.",
  pacientes:
    "Ve y edita las fichas de los residentes, sus medicamentos y su historial. Para enfermería o administración.",
  pacientes_lectura:
    "Ve las fichas y registra las dosis dadas, sin poder editarlas. Para cuidadores.",
  usuarios:
    "Crea cuentas, asigna estos permisos, desactiva cuentas y da contraseñas temporales. Solo para quien administra el sistema.",
};

/**
 * Roles que pueden ver las fichas de pacientes y registrar dosis; solo "pacientes"
 * puede editarlas.
 */
export const ROLES_VER_FICHAS = ["pacientes", "pacientes_lectura"] as const satisfies RolAdmin[];

/** Íconos disponibles para el panel. Para agregar uno, súmalo en components/admin/icono-admin.tsx. */
export type NombreIconoAdmin =
  | "House"
  | "Inbox"
  | "Globe"
  | "CalendarDays"
  | "Package"
  | "ClipboardList"
  | "CircleUser"
  | "UsersRound";

export type ModuloAdmin = {
  nombre: string;
  /** Nombre corto para la barra inferior del celular. */
  nombreCorto: string;
  descripcion: string;
  href: string;
  icono: NombreIconoAdmin;
  /** Basta con tener uno de estos roles. */
  roles: readonly RolAdmin[];
  disponible: boolean;
  /**
   * false: no ocupa lugar en el menú; se entra desde el inicio del panel. Para tareas
   * ocasionales: con todos los roles, el menú ya tiene 5 elementos y en un celular de
   * 360 px no cabe uno más.
   */
  enMenu?: boolean;
};

export const modulosAdmin = [
  {
    nombre: "Contactos",
    nombreCorto: "Contactos",
    descripcion: "Solicitudes de información recibidas desde el sitio web.",
    href: "/admin/leads",
    icono: "Inbox",
    roles: ["sitio"],
    disponible: true,
  },
  {
    nombre: "Sitio web",
    nombreCorto: "Sitio",
    descripcion: "Nombre, contacto, fotos, servicios, testimonios y preguntas del sitio.",
    href: "/admin/sitio",
    icono: "Globe",
    roles: ["sitio"],
    disponible: true,
  },
  {
    nombre: "Agenda",
    nombreCorto: "Agenda",
    descripcion: "Visitas de familias, citas y actividades.",
    href: "/admin/agenda",
    icono: "CalendarDays",
    roles: ["pacientes"],
    disponible: false,
  },
  {
    nombre: "Inventario",
    nombreCorto: "Inventario",
    descripcion: "Insumos, medicamentos y materiales.",
    href: "/admin/inventario",
    icono: "Package",
    roles: ["pacientes"],
    disponible: false,
  },
  {
    nombre: "Pacientes",
    nombreCorto: "Pacientes",
    descripcion: "Fichas de residentes: datos, medicamentos y código QR.",
    href: "/admin/pacientes",
    icono: "ClipboardList",
    roles: ROLES_VER_FICHAS,
    disponible: true,
  },
  {
    nombre: "Usuarios",
    nombreCorto: "Usuarios",
    descripcion: "Cuentas del panel: crearlas, asignar permisos y desactivarlas.",
    href: "/admin/usuarios",
    icono: "UsersRound",
    roles: ["usuarios"],
    disponible: true,
    enMenu: false,
  },
] as const satisfies readonly ModuloAdmin[];

export type ElementoNavegacion = Pick<ModuloAdmin, "nombre" | "nombreCorto" | "href" | "icono">;

/** Módulos que corresponden a los roles de una persona. */
export function modulosPara(roles: readonly RolAdmin[]): readonly ModuloAdmin[] {
  return modulosAdmin.filter((m) => m.roles.some((rol) => roles.includes(rol)));
}

/** Menú: inicio + módulos disponibles para sus roles + su cuenta. */
export function navegacionPara(roles: readonly RolAdmin[]): ElementoNavegacion[] {
  return [
    { nombre: "Inicio", nombreCorto: "Inicio", href: "/admin", icono: "House" },
    ...modulosPara(roles).filter((m) => m.disponible && m.enMenu !== false),
    { nombre: "Mi cuenta", nombreCorto: "Cuenta", href: "/admin/cuenta", icono: "CircleUser" },
  ];
}
