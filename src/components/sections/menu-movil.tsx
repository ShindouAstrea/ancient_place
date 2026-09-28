"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { clasesBoton } from "@/components/ui/boton";

type ItemNavegacion = { readonly etiqueta: string; readonly href: string };

/**
 * Menú hamburguesa para pantallas pequeñas.
 * Accesibilidad: aria-expanded/aria-controls en el botón, cierre con Escape
 * (devolviendo el foco al botón) y al elegir un enlace.
 */
export function MenuMovil({ navegacion }: { navegacion: readonly ItemNavegacion[] }) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [abierto]);

  const cerrar = () => setAbierto(false);

  return (
    <div className="lg:hidden">
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls="menu-movil"
        onClick={() => setAbierto((v) => !v)}
        className="flex size-12 items-center justify-center rounded-full text-salvia-800 hover:bg-salvia-100"
      >
        {abierto ? (
          <X className="size-7" aria-hidden="true" />
        ) : (
          <Menu className="size-7" aria-hidden="true" />
        )}
        <span className="sr-only">{abierto ? "Cerrar menú" : "Abrir menú"}</span>
      </button>

      <nav
        id="menu-movil"
        aria-label="Principal"
        hidden={!abierto}
        className="absolute inset-x-0 top-full border-b border-salvia-200 bg-crema shadow-lg"
      >
        <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 sm:px-8">
          {navegacion.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={cerrar}
                className="flex min-h-12 items-center rounded-xl px-4 text-lg font-semibold hover:bg-salvia-100"
              >
                {item.etiqueta}
              </Link>
            </li>
          ))}
          <li className="mt-2">
            <Link
              href="/#contacto"
              onClick={cerrar}
              className={clasesBoton({ tamano: "grande", variante: "primario" }) + " w-full"}
            >
              Contáctanos
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
