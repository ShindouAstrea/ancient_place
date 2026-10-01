"use client";

import { Ban, Check, CircleAlert, LoaderCircle, Pill, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/boton";
import { CampoAreaTexto, CampoSeleccion } from "@/components/ui/campo";
import {
  anularDosisAccion,
  registrarDosisAccion,
  registrarSituacionalAccion,
} from "@/server/actions/dosis";
import type { EstadoEdicion } from "@/server/validators/contenido";
import { ETIQUETAS_MOTIVO_OMISION, MOTIVOS_OMISION } from "@/server/validators/dosis";

/**
 * Mensaje de error bajo los botones (el éxito se ve en la fila, que se actualiza sola).
 * «Actualizar» vuelve a cargar los datos: por ejemplo, para ver quién registró la dosis
 * si otra persona se adelantó.
 */
function MensajeError({ estado }: { estado: EstadoEdicion | null }) {
  const router = useRouter();
  if (estado?.estado !== "error") return null;
  return (
    <div role="alert" className="mt-2 space-y-2">
      <p className="flex gap-2 text-base font-semibold text-terracota">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        {estado.mensaje}
      </p>
      {estado.errores ? null : (
        <Boton variante="secundario" onClick={() => router.refresh()}>
          <RefreshCw className="size-5" aria-hidden="true" />
          Actualizar
        </Boton>
      )}
    </div>
  );
}

/**
 * «Dada» (un toque) o «No se dio» (pide el motivo) para una dosis programada.
 * La base de datos registra quién y a qué hora, e impide registrarla dos veces.
 */
export function AccionesDosis({
  medicamentoId,
  fecha,
  hora,
  descripcion,
}: {
  medicamentoId: string;
  fecha: string;
  hora: string;
  /** Ej: "Losartán de las 08:00", para los nombres accesibles de los botones. */
  descripcion: string;
}) {
  const [omitiendo, setOmitiendo] = useState(false);
  const [estado, setEstado] = useState<EstadoEdicion | null>(null);
  const [ocupado, iniciar] = useTransition();
  const errores = estado?.estado === "error" ? (estado.errores ?? {}) : {};
  const prefijo = `omision-${medicamentoId}-${fecha}-${hora.replace(":", "")}`;

  function registrar(datos: {
    resultado: "administrada" | "omitida";
    motivo: string | null;
    observacion: string;
  }) {
    iniciar(async () => {
      setEstado(await registrarDosisAccion({ medicamentoId, fecha, hora, ...datos }));
    });
  }

  function guardarOmision(formData: FormData) {
    const motivo = formData.get("motivo");
    const observacion = formData.get("observacion");
    registrar({
      resultado: "omitida",
      motivo: typeof motivo === "string" && motivo ? motivo : null,
      observacion: typeof observacion === "string" ? observacion : "",
    });
  }

  if (omitiendo) {
    return (
      <form
        action={guardarOmision}
        noValidate
        className="mt-3 space-y-3 rounded-xl bg-salvia-50 p-3"
      >
        <CampoSeleccion
          id={`${prefijo}-motivo`}
          name="motivo"
          etiqueta="¿Por qué no se dio?"
          opciones={MOTIVOS_OMISION.map((m) => ({
            valor: m,
            etiqueta: ETIQUETAS_MOTIVO_OMISION[m],
          }))}
          error={errores.motivo}
        />
        <CampoAreaTexto
          id={`${prefijo}-observacion`}
          name="observacion"
          etiqueta="Detalle"
          opcional
          rows={2}
          maxLength={500}
          error={errores.observacion}
        />
        <div className="flex flex-wrap gap-2">
          <Boton type="submit" disabled={ocupado}>
            {ocupado ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
            Guardar
          </Boton>
          <Boton variante="secundario" onClick={() => setOmitiendo(false)} disabled={ocupado}>
            Cancelar
          </Boton>
        </div>
        {estado?.estado === "error" && !estado.errores ? <MensajeError estado={estado} /> : null}
      </form>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Boton
          onClick={() => registrar({ resultado: "administrada", motivo: null, observacion: "" })}
          disabled={ocupado}
          aria-label={`Dada: ${descripcion}`}
        >
          {ocupado ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-5" aria-hidden="true" />
          )}
          Dada
        </Boton>
        <Boton
          variante="secundario"
          onClick={() => {
            setEstado(null);
            setOmitiendo(true);
          }}
          disabled={ocupado}
          aria-label={`No se dio: ${descripcion}`}
        >
          <X className="size-5" aria-hidden="true" />
          No se dio
        </Boton>
      </div>
      <MensajeError estado={estado} />
    </div>
  );
}

/** Registrar una dosis de un medicamento situacional, con la situación que la motivó. */
export function AccionSituacional({
  medicamentoId,
  nombre,
}: {
  medicamentoId: string;
  nombre: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoEdicion | null>(null);
  const [ocupado, iniciar] = useTransition();
  const errores = estado?.estado === "error" ? (estado.errores ?? {}) : {};

  function guardar(formData: FormData) {
    const observacion = formData.get("observacion");
    iniciar(async () => {
      const resultado = await registrarSituacionalAccion({
        medicamentoId,
        observacion: typeof observacion === "string" ? observacion : "",
      });
      setEstado(resultado);
      if (resultado.estado === "exito") setAbierto(false);
    });
  }

  if (!abierto) {
    return (
      <div className="mt-3">
        <Boton
          variante="secundario"
          onClick={() => {
            setEstado(null);
            setAbierto(true);
          }}
          aria-label={`Registrar dosis: ${nombre}`}
        >
          <Pill className="size-5" aria-hidden="true" />
          Registrar dosis
        </Boton>
        {estado?.estado === "exito" ? (
          <p role="status" className="mt-2 font-semibold text-salvia-800">
            {estado.mensaje}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={guardar} noValidate className="mt-3 space-y-3 rounded-xl bg-salvia-50 p-3">
      <CampoAreaTexto
        id={`situacion-${medicamentoId}`}
        name="observacion"
        etiqueta="¿Qué situación la motivó?"
        placeholder="Ej: dolor 6/10, fiebre 38,5 °C"
        rows={2}
        maxLength={500}
        error={errores.observacion}
      />
      <div className="flex flex-wrap gap-2">
        <Boton type="submit" disabled={ocupado}>
          {ocupado ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
          Guardar
        </Boton>
        <Boton variante="secundario" onClick={() => setAbierto(false)} disabled={ocupado}>
          Cancelar
        </Boton>
      </div>
      {estado?.estado === "error" && !estado.errores ? <MensajeError estado={estado} /> : null}
    </form>
  );
}

/** Anular un registro (con motivo). Nunca se borra: queda a la vista como anulado. */
export function AnularRegistro({ id, descripcion }: { id: string; descripcion: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoEdicion | null>(null);
  const [ocupado, iniciar] = useTransition();
  const errores = estado?.estado === "error" ? (estado.errores ?? {}) : {};

  function anular(formData: FormData) {
    const motivo = formData.get("motivo");
    iniciar(async () => {
      setEstado(await anularDosisAccion({ id, motivo: typeof motivo === "string" ? motivo : "" }));
    });
  }

  if (!abierto) {
    return (
      <Boton
        variante="secundario"
        className="mt-3"
        onClick={() => setAbierto(true)}
        aria-label={`Anular: ${descripcion}`}
      >
        <Ban className="size-5" aria-hidden="true" />
        Anular
      </Boton>
    );
  }

  return (
    <form action={anular} noValidate className="mt-3 space-y-3 rounded-xl bg-terracota-claro p-3">
      <CampoAreaTexto
        id={`anular-${id}`}
        name="motivo"
        etiqueta="¿Por qué se anula?"
        ayuda="El registro no se borra: queda marcado como anulado, con este motivo."
        rows={2}
        maxLength={300}
        error={errores.motivo}
      />
      <div className="flex flex-wrap gap-2">
        <Boton type="submit" disabled={ocupado} className="bg-terracota hover:bg-terracota/90">
          {ocupado ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : null}
          Anular registro
        </Boton>
        <Boton variante="secundario" onClick={() => setAbierto(false)} disabled={ocupado}>
          Cancelar
        </Boton>
      </div>
      {estado?.estado === "error" && !estado.errores ? <MensajeError estado={estado} /> : null}
    </form>
  );
}
