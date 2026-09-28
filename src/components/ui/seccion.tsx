import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/** Ancho máximo y márgenes laterales comunes a todo el sitio. */
export function Contenedor({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>{children}</div>;
}

type SeccionProps = {
  /** id del ancla (ej: "servicios" → /#servicios). También genera el id del título. */
  id: string;
  titulo: string;
  introduccion?: string;
  /** Fondo alternativo para separar visualmente secciones consecutivas. */
  alterna?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Sección de la landing con título accesible: el <section> queda etiquetado por su
 * <h2> (aria-labelledby), lo que facilita la navegación con lectores de pantalla.
 */
export function Seccion({ id, titulo, introduccion, alterna, className, children }: SeccionProps) {
  const idTitulo = `${id}-titulo`;
  return (
    <section
      id={id}
      aria-labelledby={idTitulo}
      className={cn("py-16 sm:py-24", alterna ? "bg-crema-oscuro" : "bg-crema", className)}
    >
      <Contenedor>
        <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
          <h2 id={idTitulo} className="text-3xl font-semibold sm:text-4xl">
            {titulo}
          </h2>
          {introduccion ? <p className="mt-4 text-tinta-suave">{introduccion}</p> : null}
        </header>
        {children}
      </Contenedor>
    </section>
  );
}
