import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type Variante = "primario" | "secundario" | "whatsapp";
type Tamano = "normal" | "grande";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-60 min-h-11 min-w-11";

const variantes: Record<Variante, string> = {
  primario: "bg-salvia-700 text-white hover:bg-salvia-800",
  secundario: "border-2 border-salvia-700 bg-white text-salvia-800 hover:bg-salvia-50",
  whatsapp: "bg-whatsapp text-white hover:bg-whatsapp-oscuro",
};

const tamanos: Record<Tamano, string> = {
  normal: "px-5 py-2 text-base",
  grande: "px-7 py-3.5 text-lg",
};

type Estilo = { variante?: Variante; tamano?: Tamano };

export function clasesBoton({ variante = "primario", tamano = "normal" }: Estilo = {}) {
  return cn(base, variantes[variante], tamanos[tamano]);
}

/** Botón de acción (formularios, menús). Zona táctil mínima de 44x44 px. */
export function Boton({
  variante,
  tamano,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & Estilo) {
  return (
    <button type={type} className={cn(clasesBoton({ variante, tamano }), className)} {...props} />
  );
}

/**
 * Enlace con aspecto de botón. Los enlaces externos se abren en una pestaña nueva
 * con rel="noopener noreferrer".
 */
export function BotonEnlace({
  variante,
  tamano,
  className,
  externo = false,
  ...props
}: ComponentProps<"a"> & Estilo & { externo?: boolean }) {
  return (
    <a
      className={cn(clasesBoton({ variante, tamano }), className)}
      {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
    />
  );
}
