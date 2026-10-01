import {
  ChevronRight,
  CircleCheck,
  History,
  Pencil,
  Phone,
  Pill,
  QrCode,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { AgendaMedicamentos } from "@/components/admin/pacientes/agenda-medicamentos";
import { DosisDeHoy } from "@/components/admin/pacientes/dosis-de-hoy";
import { BotonEgreso } from "@/components/admin/pacientes/boton-egreso";
import { FichaNoEncontrada } from "@/components/admin/pacientes/ficha-no-encontrada";
import { InsigniaDeterioro } from "@/components/admin/pacientes/insignia-deterioro";
import { BotonEnlace } from "@/components/ui/boton";
import { Tarjeta } from "@/components/ui/tarjeta";
import { enlaceTelefono, formatearTelefono } from "@/lib/utils/contacto";
import { calcularEdad, formatearFecha, formatearFechaHora } from "@/lib/utils/fechas";
import { formatearRut } from "@/lib/utils/rut";
import { obtenerDosisDeHoy } from "@/server/services/dosis";
import { obtenerFicha } from "@/server/services/pacientes";
import { esquemaId } from "@/server/validators/contenido";
import { ETIQUETAS_DETERIORO, ETIQUETAS_SEXO } from "@/server/validators/pacientes";

// Título genérico: el nombre del paciente no queda en el historial del navegador.
export const metadata: Metadata = { title: "Ficha de paciente" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Acciones del editor. En el celular, ícono arriba y texto abajo: los cuatro botones
 * caben en dos columnas sin cortar «Medicamentos». Desde sm, botones de una línea.
 */
const claseAccion =
  "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-salvia-700 " +
  "bg-white px-2 py-2 text-base font-semibold text-salvia-800 hover:bg-salvia-50 " +
  "sm:min-h-11 sm:flex-row sm:gap-2 sm:rounded-full sm:px-5";

const AVISOS: Record<string, string> = {
  creada: "Ficha creada. Agrega sus medicamentos con el botón «Medicamentos».",
  guardada: "Cambios guardados.",
};

function Bloque({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`bloque-${id}`} className="space-y-3">
      <h2 id={`bloque-${id}`} className="text-2xl font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Dato de la lista "Datos generales"; se omite si está vacío. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-base text-tinta-suave">{etiqueta}</dt>
      <dd className="font-semibold [overflow-wrap:anywhere]">{valor}</dd>
    </div>
  );
}

/**
 * Ficha del residente, pensada para leerse en el celular al escanear su QR: primero
 * lo urgente (alergias, medicamentos por hora, deterioro cognitivo) y luego el resto.
 * Cada vez que alguien la abre queda registrado en su historial.
 */
export default async function FichaPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) return <FichaNoEncontrada />;

  const { ficha, puedeEditar } = await obtenerFicha(id);
  if (!ficha) return <FichaNoEncontrada />;
  // Egresado: no se registran dosis.
  const hoy = ficha.fecha_egreso ? null : await obtenerDosisDeHoy(id, ficha.medicamentos);

  const { aviso } = await searchParams;
  const mensaje = typeof aviso === "string" ? AVISOS[aviso] : undefined;
  const subtitulo = [
    ficha.fecha_nacimiento ? `${calcularEdad(ficha.fecha_nacimiento)} años` : null,
    ficha.habitacion ? `Habitación ${ficha.habitacion}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <div>
        <EnlaceVolver href="/admin/pacientes">Pacientes</EnlaceVolver>

        {mensaje ? (
          <p
            role="status"
            className="mb-4 flex gap-2 rounded-xl bg-salvia-100 p-4 font-semibold text-salvia-900"
          >
            <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            {mensaje}
          </p>
        ) : null}

        <header className="space-y-3">
          <h1 className="text-3xl font-semibold [overflow-wrap:anywhere]">
            {ficha.nombres} {ficha.apellidos}
          </h1>
          {subtitulo.length > 0 ? (
            <p className="text-lg text-tinta-suave">{subtitulo.join(" · ")}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <InsigniaDeterioro grado={ficha.deterioro_cognitivo} />
            {ficha.fecha_egreso ? (
              <span className="inline-flex items-center rounded-full bg-stone-200 px-3 py-1 text-base font-semibold text-stone-700">
                Egresado el {formatearFecha(ficha.fecha_egreso)}
              </span>
            ) : null}
          </div>
        </header>
      </div>

      {ficha.alergias ? (
        <div
          role="note"
          aria-label="Alergias"
          className="flex gap-3 rounded-2xl border-2 border-terracota bg-terracota-claro p-4"
        >
          <TriangleAlert className="mt-0.5 size-6 shrink-0 text-terracota" aria-hidden="true" />
          <p className="[overflow-wrap:anywhere] whitespace-pre-line">
            <span className="font-semibold">Alergias: </span>
            {ficha.alergias}
          </p>
        </div>
      ) : (
        <p className="text-base text-tinta-suave">Sin alergias registradas.</p>
      )}

      {puedeEditar ? (
        <nav
          aria-label="Acciones de la ficha"
          className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
        >
          <Link href={`/admin/pacientes/${id}/editar`} className={claseAccion}>
            <Pencil className="size-5" aria-hidden="true" />
            Editar datos
          </Link>
          <Link href={`/admin/pacientes/${id}/medicamentos`} className={claseAccion}>
            <Pill className="size-5" aria-hidden="true" />
            Medicamentos
          </Link>
          <Link href={`/admin/pacientes/${id}/qr`} className={claseAccion}>
            <QrCode className="size-5" aria-hidden="true" />
            Código QR
          </Link>
          <Link href={`/admin/pacientes/${id}/historial`} className={claseAccion}>
            <History className="size-5" aria-hidden="true" />
            Historial
          </Link>
        </nav>
      ) : null}

      {hoy ? (
        <Bloque id="dosis" titulo="Dosis de hoy">
          <DosisDeHoy programadas={hoy.programadas} situacionales={hoy.situacionales} />
          <Link
            href={`/admin/pacientes/${id}/dosis`}
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-salvia-800 underline-offset-4 hover:underline"
          >
            Registro de dosis de los últimos 14 días
            <ChevronRight className="size-5" aria-hidden="true" />
          </Link>
        </Bloque>
      ) : null}

      <Bloque id="medicamentos" titulo="Medicamentos indicados">
        <AgendaMedicamentos medicamentos={ficha.medicamentos} />
      </Bloque>

      <Bloque id="deterioro" titulo="Deterioro cognitivo">
        <Tarjeta className="space-y-2">
          <p className="font-semibold">{ETIQUETAS_DETERIORO[ficha.deterioro_cognitivo]}</p>
          {ficha.deterioro_detalle ? (
            <p className="[overflow-wrap:anywhere] whitespace-pre-line">
              {ficha.deterioro_detalle}
            </p>
          ) : null}
        </Tarjeta>
      </Bloque>

      <Bloque id="observaciones" titulo="Observaciones">
        <Tarjeta>
          {ficha.observaciones ? (
            <p className="[overflow-wrap:anywhere] whitespace-pre-line">{ficha.observaciones}</p>
          ) : (
            <p className="text-tinta-suave">Sin observaciones.</p>
          )}
        </Tarjeta>
      </Bloque>

      <Bloque id="contacto" titulo="Contacto de emergencia">
        <Tarjeta className="space-y-3">
          {ficha.contacto_nombre || ficha.contacto_telefono ? (
            <>
              {ficha.contacto_nombre ? (
                <p className="font-semibold [overflow-wrap:anywhere]">
                  {ficha.contacto_nombre}
                  {ficha.contacto_parentesco ? (
                    <span className="font-normal text-tinta-suave">
                      {" "}
                      ({ficha.contacto_parentesco})
                    </span>
                  ) : null}
                </p>
              ) : null}
              {ficha.contacto_telefono ? (
                <BotonEnlace
                  href={enlaceTelefono(ficha.contacto_telefono)}
                  className="w-full sm:w-auto"
                >
                  <Phone className="size-5" aria-hidden="true" />
                  Llamar al {formatearTelefono(ficha.contacto_telefono)}
                </BotonEnlace>
              ) : null}
            </>
          ) : (
            <p className="text-tinta-suave">Sin contacto de emergencia registrado.</p>
          )}
        </Tarjeta>
      </Bloque>

      <Bloque id="datos" titulo="Datos generales">
        <Tarjeta>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato etiqueta="RUT" valor={ficha.rut ? formatearRut(ficha.rut) : null} />
            <Dato
              etiqueta="Fecha de nacimiento"
              valor={ficha.fecha_nacimiento ? formatearFecha(ficha.fecha_nacimiento) : null}
            />
            <Dato etiqueta="Sexo" valor={ficha.sexo ? ETIQUETAS_SEXO[ficha.sexo] : null} />
            <Dato
              etiqueta="Fecha de ingreso"
              valor={ficha.fecha_ingreso ? formatearFecha(ficha.fecha_ingreso) : null}
            />
            <Dato etiqueta="Habitación o cama" valor={ficha.habitacion} />
            <Dato etiqueta="Previsión" valor={ficha.prevision} />
            <Dato etiqueta="Médico tratante" valor={ficha.medico_tratante} />
          </dl>
        </Tarjeta>
      </Bloque>

      {puedeEditar ? <BotonEgreso pacienteId={id} egresado={Boolean(ficha.fecha_egreso)} /> : null}

      <p className="text-base text-tinta-suave">
        Última actualización: {formatearFechaHora(ficha.updated_at)}
      </p>
    </div>
  );
}
