"use client";

import { CircleAlert, CircleCheck, LoaderCircle, Save } from "lucide-react";
import { startTransition, useActionState, useState, type FormEvent } from "react";

import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/utils/cn";
import type { EstadoEdicion } from "@/server/validators/contenido";

import { CampoEditable } from "./campo-editable";
import type { CampoEditable as Definicion } from "./definiciones";

type Props = {
  /** Server Action ya asociada a la sección (guardarSeccion.bind(null, "contacto")). */
  accion: (estado: EstadoEdicion, formData: FormData) => Promise<EstadoEdicion>;
  campos: Definicion[];
  valores: Record<string, string>;
  prefijo: string;
};

const INICIAL: EstadoEdicion = { estado: "inicial" };

/**
 * Formulario de una sección de la información del sitio. Se envía manualmente (y no
 * con <form action>) para que un error de validación no borre lo escrito.
 */
export function FormularioSeccion({ accion, campos, valores, prefijo }: Props) {
  const [estado, enviar, guardando] = useActionState(accion, INICIAL);
  // El mensaje de "guardado" se oculta en cuanto se vuelve a editar.
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const errores = estado.estado === "error" ? (estado.errores ?? {}) : {};

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    const formData = new FormData(evento.currentTarget);
    setMostrarResultado(true);
    startTransition(() => enviar(formData));
  }

  return (
    <form
      onSubmit={alEnviar}
      onChange={() => setMostrarResultado(false)}
      noValidate
      aria-busy={guardando}
      className="grid gap-5 sm:grid-cols-2"
    >
      {campos.map((campo) => (
        <div key={campo.nombre} className={cn(!campo.medio && "sm:col-span-2")}>
          <CampoEditable
            campo={campo}
            valor={valores[campo.nombre] ?? ""}
            error={errores[campo.nombre]}
            prefijo={prefijo}
          />
        </div>
      ))}

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        <Boton type="submit" disabled={guardando} className="w-full sm:w-auto">
          {guardando ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-5" aria-hidden="true" />
          )}
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Boton>
        <div aria-live="polite" className="text-base">
          {mostrarResultado && !guardando && estado.estado === "exito" ? (
            <p className="flex items-center gap-2 font-semibold text-salvia-800">
              <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
              {estado.mensaje}
            </p>
          ) : null}
          {mostrarResultado && !guardando && estado.estado === "error" ? (
            <p className="flex items-center gap-2 font-semibold text-terracota">
              <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
              {estado.mensaje}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
