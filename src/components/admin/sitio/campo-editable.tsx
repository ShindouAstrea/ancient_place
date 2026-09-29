"use client";

import { useState } from "react";

import { CampoAreaTexto, CampoTexto, claseControl } from "@/components/ui/campo";
import { Icono } from "@/components/ui/icono";
import { ICONOS, NOMBRES_ICONOS } from "@/config/iconos";

import type { CampoEditable as Definicion } from "./definiciones";

type Props = {
  campo: Definicion;
  valor: string;
  error?: string;
  /** Prefijo para ids únicos cuando hay varios formularios con los mismos campos. */
  prefijo?: string;
};

/** Selector de ícono con vista previa. */
function CampoIcono({ id, campo, valor, error }: { id: string } & Omit<Props, "prefijo">) {
  const [elegido, setElegido] = useState(valor || NOMBRES_ICONOS[0]);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {campo.etiqueta}
      </label>
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-salvia-100 text-salvia-700">
          <Icono nombre={elegido} className="size-6" />
        </span>
        <select
          id={id}
          name={campo.nombre}
          value={elegido}
          onChange={(e) => setElegido(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={claseControl}
        >
          {NOMBRES_ICONOS.map((nombre) => (
            <option key={nombre} value={nombre}>
              {ICONOS[nombre]}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-base font-semibold text-terracota">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Campo de un formulario del módulo Sitio web, según su definición. */
export function CampoEditable({ campo, valor, error, prefijo = "campo" }: Props) {
  const id = `${prefijo}-${campo.nombre}`;
  const comunes = {
    id,
    name: campo.nombre,
    etiqueta: campo.etiqueta,
    ayuda: campo.ayuda,
    error,
    opcional: !campo.requerido,
    defaultValue: valor,
    maxLength: campo.maximo,
    placeholder: campo.placeholder,
  };

  switch (campo.tipo) {
    case "icono":
      return <CampoIcono id={id} campo={campo} valor={valor} error={error} />;
    case "area":
      return <CampoAreaTexto {...comunes} rows={campo.filas ?? 3} />;
    case "email":
      return <CampoTexto {...comunes} type="email" inputMode="email" autoComplete="off" />;
    case "tel":
      return <CampoTexto {...comunes} type="tel" inputMode="tel" autoComplete="off" />;
    case "url":
      return <CampoTexto {...comunes} type="url" inputMode="url" autoComplete="off" />;
    default:
      return <CampoTexto {...comunes} autoComplete="off" />;
  }
}
