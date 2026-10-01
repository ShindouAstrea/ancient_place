"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ElementoNavegacion } from "@/config/admin";
import { cn } from "@/lib/utils/cn";

import { IconoAdmin } from "./icono-admin";

function estaActiva(ruta: string, href: string) {
  return href === "/admin" ? ruta === "/admin" : ruta === href || ruta.startsWith(`${href}/`);
}

type Props = { items: ElementoNavegacion[] };

/** Navegación del panel en pantallas medianas y grandes (dentro del header). */
export function NavegacionSuperior({ items }: Props) {
  const ruta = usePathname();
  return (
    <nav aria-label="Panel" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {items.map((item) => {
          const activa = estaActiva(ruta, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full px-4 text-base font-semibold",
                  activa ? "bg-salvia-100 text-salvia-900" : "text-tinta hover:bg-salvia-50",
                )}
              >
                <IconoAdmin nombre={item.icono} className="size-5" />
                {item.nombre}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Barra de navegación inferior para el celular: queda al alcance del pulgar.
 * Respeta el área segura inferior de iPhone.
 */
export function NavegacionInferior({ items }: Props) {
  const ruta = usePathname();
  // Con 5 módulos, letra de 14 px (como las barras de pestañas de iOS/Android) para que
  // los nombres quepan completos en un celular de 360 px.
  const compacta = items.length > 4;
  return (
    <nav
      aria-label="Panel"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-salvia-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
    >
      <ul className="flex">
        {items.map((item) => {
          const activa = estaActiva(ruta, item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 font-semibold",
                  compacta ? "text-sm" : "text-base",
                  activa ? "text-salvia-800" : "text-tinta-suave",
                )}
              >
                <IconoAdmin
                  nombre={item.icono}
                  className={cn("size-6", activa && "fill-salvia-100")}
                />
                <span className={cn("max-w-full truncate", compacta ? "px-0.5" : "px-1")}>
                  {item.nombreCorto}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
