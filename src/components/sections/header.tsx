import { Leaf } from "lucide-react";
import Link from "next/link";

import { clasesBoton } from "@/components/ui/boton";
import { Contenedor } from "@/components/ui/seccion";
import type { ContenidoSitio } from "@/types/contenido";

import { MenuMovil } from "./menu-movil";
import { tieneNosotros } from "./nosotros";
import { tieneUbicacion } from "./ubicacion";

/** Enlaces del menú: solo a las secciones que tienen contenido. */
function navegacionPublica({ config, servicios, fotos, preguntas }: ContenidoSitio) {
  return [
    { etiqueta: "Nosotros", href: "/#nosotros", visible: tieneNosotros(config) },
    { etiqueta: "Servicios", href: "/#servicios", visible: servicios.length > 0 },
    { etiqueta: "Instalaciones", href: "/#instalaciones", visible: fotos.length > 0 },
    { etiqueta: "Preguntas", href: "/#preguntas", visible: preguntas.length > 0 },
    { etiqueta: "Ubicación", href: "/#ubicacion", visible: tieneUbicacion(config) },
  ]
    .filter((item) => item.visible)
    .map(({ etiqueta, href }) => ({ etiqueta, href }));
}

/** Header fijo (sticky) con logo, navegación en escritorio y menú hamburguesa en móvil. */
export function Header({ contenido }: { contenido: ContenidoSitio }) {
  const navegacion = navegacionPublica(contenido);

  return (
    <header className="sticky top-0 z-40 border-b border-salvia-200 bg-crema/95 backdrop-blur supports-backdrop-filter:bg-crema/85">
      <Contenedor className="flex h-18 items-center justify-between gap-4">
        {/* Logo: ícono + nombre del hogar (editable desde el panel). */}
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 font-serif text-xl font-semibold text-salvia-800"
        >
          <Leaf className="size-7 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1">{contenido.config.nombre}</span>
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navegacion.map((item) => (
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

        <MenuMovil navegacion={navegacion} />
      </Contenedor>
    </header>
  );
}
