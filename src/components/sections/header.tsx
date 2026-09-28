import { Leaf } from "lucide-react";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { clasesBoton } from "@/components/ui/boton";
import { Contenedor } from "@/components/ui/seccion";

import { MenuMovil } from "./menu-movil";

/** Header fijo (sticky) con logo, navegación en escritorio y menú hamburguesa en móvil. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-salvia-200 bg-crema/95 backdrop-blur supports-backdrop-filter:bg-crema/85">
      <Contenedor className="flex h-18 items-center justify-between gap-4">
        {/* Logo provisorio: ícono + nombre. Reemplazar por el logo real cuando exista. */}
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 font-serif text-xl font-semibold text-salvia-800"
        >
          <Leaf className="size-7 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">{siteConfig.nombre}</span>
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {siteConfig.navegacion.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-11 items-center rounded-full px-4 text-base font-semibold text-tinta hover:bg-salvia-100"
                >
                  {item.etiqueta}
                </Link>
              </li>
            ))}
            <li className="ml-2">
              <Link href="/#contacto" className={clasesBoton()}>
                Contáctanos
              </Link>
            </li>
          </ul>
        </nav>

        <MenuMovil navegacion={siteConfig.navegacion} />
      </Contenedor>
    </header>
  );
}
