"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps, type Ref } from "react";

import { cn } from "@/lib/utils/cn";

import { claseControl } from "./campo";

type Props = {
  id: string;
  etiqueta: string;
  /** "current-password" (contraseña actual) o "new-password" (nueva): ayuda a los gestores de contraseñas. */
  autoComplete: "current-password" | "new-password";
  ayuda?: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
  onChange?: ComponentProps<"input">["onChange"];
};

/**
 * Campo de contraseña con botón para mostrarla u ocultarla (útil al escribir en el
 * celular). Etiqueta visible, ayuda y error enlazados con aria-describedby.
 */
export function CampoContrasena({
  id,
  etiqueta,
  autoComplete,
  ayuda,
  error,
  ref,
  onChange,
}: Props) {
  const [visible, setVisible] = useState(false);
  const describedBy =
    [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {etiqueta}
      </label>
      {ayuda ? (
        <p id={`${id}-ayuda`} className="text-base text-tinta-suave">
          {ayuda}
        </p>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          maxLength={72}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={onChange}
          className={cn(claseControl, "pr-14")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0.5 right-0.5 flex w-12 items-center justify-center rounded-r-[10px] text-salvia-800 hover:bg-salvia-50"
        >
          {visible ? (
            <EyeOff className="size-6" aria-hidden="true" />
          ) : (
            <Eye className="size-6" aria-hidden="true" />
          )}
          <span className="sr-only">
            {visible ? `Ocultar ${etiqueta.toLowerCase()}` : `Mostrar ${etiqueta.toLowerCase()}`}
          </span>
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-base font-semibold text-terracota">
          {error}
        </p>
      ) : null}
    </div>
  );
}
