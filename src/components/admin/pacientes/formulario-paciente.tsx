"use client";

import { CircleAlert, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { Boton, clasesBoton } from "@/components/ui/boton";
import { CampoAreaTexto, CampoSeleccion, CampoTexto } from "@/components/ui/campo";
import { guardarPacienteAccion } from "@/server/actions/pacientes";
import { erroresPorCampo } from "@/server/validators/contacto";
import type { EstadoEdicion } from "@/server/validators/contenido";
import {
  ETIQUETAS_DETERIORO,
  ETIQUETAS_SEXO,
  GRADOS_DETERIORO,
  SEXOS,
  esquemaPaciente,
  type CampoPaciente,
} from "@/server/validators/pacientes";
import type { Paciente } from "@/types/pacientes";

const INICIAL: EstadoEdicion = { estado: "inicial" };

/** Orden de los campos en pantalla: el foco va al primero con error. */
const ORDEN: CampoPaciente[] = [
  "nombres",
  "apellidos",
  "rut",
  "fecha_nacimiento",
  "sexo",
  "fecha_ingreso",
  "habitacion",
  "alergias",
  "prevision",
  "medico_tratante",
  "deterioro_cognitivo",
  "deterioro_detalle",
  "observaciones",
  "contacto_nombre",
  "contacto_parentesco",
  "contacto_telefono",
];

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5 rounded-2xl border border-salvia-200 bg-white p-4 sm:grid-cols-2 sm:p-6">
      <legend className="px-1 font-serif text-xl font-semibold">{titulo}</legend>
      {children}
    </fieldset>
  );
}

/** Crear (paciente null) o editar una ficha. Si todo está bien, el servidor abre la ficha. */
export function FormularioPaciente({ paciente }: { paciente: Paciente | null }) {
  const [estado, enviar, guardando] = useActionState(
    guardarPacienteAccion.bind(null, paciente?.id ?? null),
    INICIAL,
  );
  const [erroresCliente, setErroresCliente] = useState<Partial<Record<string, string>> | null>(
    null,
  );
  const refAlerta = useRef<HTMLDivElement>(null);

  const errores = erroresCliente ?? (estado.estado === "error" ? (estado.errores ?? {}) : {});
  const mensajeGeneral = estado.estado === "error" && !estado.errores ? estado.mensaje : null;

  function enfocarPrimerError(lista: Partial<Record<string, string>>) {
    const campo = ORDEN.find((c) => lista[c]);
    if (campo) document.getElementById(campo)?.focus();
  }

  useEffect(() => {
    if (estado.estado !== "error") return;
    if (estado.errores) enfocarPrimerError(estado.errores);
    else refAlerta.current?.focus();
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    const formData = new FormData(evento.currentTarget);
    const validacion = esquemaPaciente.safeParse(Object.fromEntries(formData));
    if (!validacion.success) {
      const nuevos = erroresPorCampo<string>(validacion.error);
      setErroresCliente(nuevos);
      enfocarPrimerError(nuevos);
      return;
    }
    setErroresCliente(null);
    startTransition(() => enviar(formData));
  }

  const valor = (campo: keyof Paciente) => {
    const v = paciente?.[campo];
    return typeof v === "string" ? v : "";
  };
  // Props comunes: id = name, valor inicial y error.
  const campo = (nombre: CampoPaciente, obligatorio = false) => ({
    id: nombre,
    defaultValue: valor(nombre),
    error: errores[nombre],
    opcional: !obligatorio,
  });

  return (
    <form onSubmit={alEnviar} noValidate aria-busy={guardando} className="space-y-6">
      <Grupo titulo="Identificación">
        <CampoTexto
          etiqueta="Nombres"
          autoComplete="off"
          maxLength={100}
          {...campo("nombres", true)}
        />
        <CampoTexto
          etiqueta="Apellidos"
          autoComplete="off"
          maxLength={100}
          {...campo("apellidos", true)}
        />
        <CampoTexto
          etiqueta="RUT"
          autoComplete="off"
          maxLength={20}
          placeholder="12.345.678-9"
          {...campo("rut")}
        />
        <CampoTexto etiqueta="Fecha de nacimiento" type="date" {...campo("fecha_nacimiento")} />
        <CampoSeleccion
          etiqueta="Sexo"
          opciones={SEXOS.map((s) => ({ valor: s, etiqueta: ETIQUETAS_SEXO[s] }))}
          {...campo("sexo")}
        />
      </Grupo>

      <Grupo titulo="Estadía">
        <CampoTexto etiqueta="Fecha de ingreso" type="date" {...campo("fecha_ingreso")} />
        <CampoTexto
          etiqueta="Habitación o cama"
          autoComplete="off"
          maxLength={50}
          {...campo("habitacion")}
        />
      </Grupo>

      <Grupo titulo="Salud general">
        <div className="sm:col-span-2">
          <CampoAreaTexto
            etiqueta="Alergias"
            ayuda="Medicamentos, alimentos u otras. Déjalo vacío si no tiene alergias conocidas."
            rows={2}
            maxLength={1000}
            {...campo("alergias")}
          />
        </div>
        <CampoTexto
          etiqueta="Previsión de salud"
          autoComplete="off"
          maxLength={100}
          placeholder="Fonasa, Isapre…"
          {...campo("prevision")}
        />
        <CampoTexto
          etiqueta="Médico tratante"
          autoComplete="off"
          maxLength={150}
          {...campo("medico_tratante")}
        />
      </Grupo>

      <Grupo titulo="Deterioro cognitivo">
        <CampoSeleccion
          etiqueta="Grado"
          opciones={GRADOS_DETERIORO.map((g) => ({ valor: g, etiqueta: ETIQUETAS_DETERIORO[g] }))}
          {...campo("deterioro_cognitivo", true)}
          defaultValue={paciente?.deterioro_cognitivo ?? "no_evaluado"}
        />
        <div className="sm:col-span-2">
          <CampoAreaTexto
            etiqueta="Detalle"
            ayuda="Diagnóstico, cómo se manifiesta y cómo acompañarlo (ej: se desorienta en las tardes)."
            rows={3}
            maxLength={1000}
            {...campo("deterioro_detalle")}
          />
        </div>
      </Grupo>

      <Grupo titulo="Observaciones">
        <div className="sm:col-span-2">
          <CampoAreaTexto
            etiqueta="Observaciones"
            ayuda="Movilidad, alimentación, preferencias y todo lo que el equipo deba saber."
            rows={5}
            maxLength={5000}
            {...campo("observaciones")}
          />
        </div>
      </Grupo>

      <Grupo titulo="Contacto de emergencia">
        <CampoTexto
          etiqueta="Nombre"
          autoComplete="off"
          maxLength={100}
          {...campo("contacto_nombre")}
        />
        <CampoTexto
          etiqueta="Parentesco"
          autoComplete="off"
          maxLength={50}
          placeholder="Hija, sobrino…"
          {...campo("contacto_parentesco")}
        />
        <CampoTexto
          etiqueta="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="+56 9 1234 5678"
          {...campo("contacto_telefono")}
        />
      </Grupo>

      <div ref={refAlerta} tabIndex={-1} role="alert" className="outline-none">
        {mensajeGeneral ? (
          <p className="flex gap-3 rounded-xl border-2 border-terracota bg-white p-4 text-base">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
            {mensajeGeneral}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Boton type="submit" tamano="grande" disabled={guardando}>
          {guardando ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-5" aria-hidden="true" />
          )}
          {guardando ? "Guardando…" : paciente ? "Guardar cambios" : "Crear ficha"}
        </Boton>
        <Link
          href={paciente ? `/admin/pacientes/${paciente.id}` : "/admin/pacientes"}
          className={clasesBoton({ variante: "secundario", tamano: "grande" })}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
