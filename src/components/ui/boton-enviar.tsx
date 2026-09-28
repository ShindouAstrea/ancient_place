"use client";

import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Boton } from "./boton";

type Props = Omit<ComponentProps<typeof Boton>, "type"> & {
  /** Texto mientras la Server Action del formulario se ejecuta (ej: "Guardando…"). */
  textoPendiente: string;
};

/**
 * Botón de envío para formularios con Server Action (<form action={...}>).
 * Se deshabilita y muestra un indicador mientras la acción está en curso, lo que
 * además evita envíos duplicados por doble toque en el celular.
 */
export function BotonEnviar({ textoPendiente, children, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Boton type="submit" disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          {textoPendiente}
        </>
      ) : (
        children
      )}
    </Boton>
  );
}
