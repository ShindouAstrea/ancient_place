"use client";

import { useRef, useState } from "react";

import { CampoAreaTexto, CampoTexto, claseControl } from "@/components/ui/campo";
import { Icono } from "@/components/ui/icono";
import { ICONOS, NOMBRES_ICONOS } from "@/config/iconos";
import { DIAS_SEMANA, NOMBRES_DIAS } from "@/lib/utils/horario";
import { TRAMOS_HORARIO } from "@/server/validators/contenido";
import type { TramoHorario } from "@/types/contenido";

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

/** "miércoles" → "Mié" */
const abreviar = (dia: string) => dia.charAt(0).toUpperCase() + dia.slice(1, 3);

/** Como claseControl, pero con menos relleno lateral: dos horas caben lado a lado en 360 px. */
const claseHora =
  "block w-full min-w-0 min-h-12 rounded-xl border-2 border-salvia-300 bg-white px-2 py-3 " +
  "text-lg text-tinta tabular-nums focus:border-salvia-700 focus-visible:outline-offset-1 " +
  "aria-invalid:border-terracota";

/** Lee el horario guardado (JSON) sin romper el formulario si viniera mal formado. */
function leerTramos(valor: string): TramoHorario[] {
  try {
    const datos: unknown = JSON.parse(valor || "[]");
    return Array.isArray(datos) ? (datos as TramoHorario[]) : [];
  } catch {
    return [];
  }
}

/**
 * Horario por tramos: cada tramo tiene días (casillas) y horas desde/hasta. Los campos
 * se envían como tramoN_dia_D, tramoN_desde y tramoN_hasta (ver validators/contenido.ts).
 */
function CampoHorario({ id, campo, valor, error }: { id: string } & Omit<Props, "prefijo">) {
  const tramos = leerTramos(valor);
  const refGrupo = useRef<HTMLFieldSetElement>(null);

  /** Deja un tramo en blanco (se descarta al guardar). */
  function vaciarTramo(n: number) {
    refGrupo.current
      ?.querySelectorAll<HTMLInputElement>(`[name^="tramo${n}_"]`)
      .forEach((input) => {
        if (input.type === "checkbox") input.checked = false;
        else input.value = "";
      });
  }

  return (
    <fieldset
      ref={refGrupo}
      aria-describedby={[campo.ayuda && `${id}-ayuda`, error && `${id}-error`]
        .filter(Boolean)
        .join(" ")}
      className="flex flex-col gap-3"
    >
      <legend className="font-semibold">{campo.etiqueta}</legend>
      {campo.ayuda ? (
        <p id={`${id}-ayuda`} className="text-base text-tinta-suave">
          {campo.ayuda}
        </p>
      ) : null}

      {TRAMOS_HORARIO.map((n) => {
        const tramo = tramos[n - 1];
        return (
          <fieldset key={n} className="rounded-xl border-2 border-salvia-200 p-4">
            <legend className="px-1 font-semibold">
              Tramo {n}
              {n > 1 ? <span className="font-normal text-tinta-suave"> (opcional)</span> : null}
            </legend>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => (
                <label key={dia} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name={`tramo${n}_dia_${dia}`}
                    defaultChecked={tramo?.dias.includes(dia)}
                    className="peer sr-only"
                  />
                  {/* Abreviatura visible; el lector de pantalla lee el nombre completo. */}
                  <span className="flex min-h-11 min-w-12 items-center justify-center rounded-full border-2 border-salvia-300 bg-white px-3 font-semibold text-tinta-suave peer-checked:border-salvia-700 peer-checked:bg-salvia-700 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-salvia-700">
                    <span aria-hidden="true">{abreviar(NOMBRES_DIAS[dia] ?? "")}</span>
                    <span className="sr-only">{NOMBRES_DIAS[dia]}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(["desde", "hasta"] as const).map((extremo) => (
                <div key={extremo} className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={`${id}-${n}-${extremo}`} className="text-base font-semibold">
                    {extremo === "desde" ? "Desde" : "Hasta"}
                  </label>
                  <input
                    id={`${id}-${n}-${extremo}`}
                    type="time"
                    name={`tramo${n}_${extremo}`}
                    defaultValue={tramo?.[extremo] ?? ""}
                    aria-invalid={error ? true : undefined}
                    className={claseHora}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => vaciarTramo(n)}
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-salvia-800 underline-offset-4 hover:underline"
            >
              Vaciar tramo {n}
            </button>
          </fieldset>
        );
      })}

      {error ? (
        <p id={`${id}-error`} className="text-base font-semibold text-terracota">
          {error}
        </p>
      ) : null}
    </fieldset>
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
    case "horario":
      return <CampoHorario id={id} campo={campo} valor={valor} error={error} />;
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
