"use client";

import {
  CircleAlert,
  Clock,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Siren,
  Trash2,
  X,
} from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { Boton } from "@/components/ui/boton";
import { CampoAreaTexto, CampoCasilla, CampoTexto, claseHora } from "@/components/ui/campo";
import { SelectorDias } from "@/components/ui/selector-dias";
import { DIAS_SEMANA } from "@/lib/utils/horario";
import { diasDelMedicamento } from "@/lib/utils/medicamentos";
import { guardarMedicamentoAccion, quitarMedicamentoAccion } from "@/server/actions/pacientes";
import { erroresPorCampo } from "@/server/validators/contacto";
import type { EstadoEdicion } from "@/server/validators/contenido";
import {
  MAXIMO_HORARIOS,
  esquemaMedicamento,
  medicamentoDesdeFormulario,
} from "@/server/validators/pacientes";
import type { Medicamento } from "@/types/pacientes";

const INICIAL: EstadoEdicion = { estado: "inicial" };

/** Formulario para agregar (medicamento null) o editar un medicamento. */
function FormularioMedicamento({
  pacienteId,
  medicamento,
  onListo,
}: {
  pacienteId: string;
  medicamento: Medicamento | null;
  onListo: () => void;
}) {
  const [estado, enviar, guardando] = useActionState(
    guardarMedicamentoAccion.bind(null, pacienteId, medicamento?.id ?? null),
    INICIAL,
  );
  const [situacional, setSituacional] = useState(medicamento?.situacional ?? false);
  const [horarios, setHorarios] = useState<string[]>(
    medicamento?.horarios.length ? medicamento.horarios : [""],
  );
  const [erroresCliente, setErroresCliente] = useState<Partial<Record<string, string>> | null>(
    null,
  );
  const errores = erroresCliente ?? (estado.estado === "error" ? (estado.errores ?? {}) : {});
  const prefijo = `med-${medicamento?.id ?? "nuevo"}`;

  // Al guardar con éxito se cierra el formulario (la lista ya se actualizó).
  useEffect(() => {
    if (estado.estado === "exito") onListo();
  }, [estado, onListo]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    const formData = new FormData(evento.currentTarget);
    const validacion = esquemaMedicamento.safeParse(medicamentoDesdeFormulario(formData));
    if (!validacion.success) {
      const nuevos = erroresPorCampo<string>(validacion.error);
      setErroresCliente(nuevos);
      const primero = ["nombre", "dosis", "motivo_situacional", "horarios", "dias"].find(
        (c) => nuevos[c],
      );
      if (primero) document.getElementById(`${prefijo}-${primero}`)?.focus();
      return;
    }
    setErroresCliente(null);
    startTransition(() => enviar(formData));
  }

  return (
    <form
      onSubmit={alEnviar}
      noValidate
      aria-busy={guardando}
      className="grid gap-5 rounded-2xl border-2 border-salvia-300 bg-white p-4 sm:grid-cols-2 sm:p-6"
    >
      {/* Los ids llevan prefijo (puede haber varios formularios); el name es el del campo. */}
      <CampoTexto
        id={`${prefijo}-nombre`}
        name="nombre"
        etiqueta="Medicamento"
        autoComplete="off"
        maxLength={150}
        defaultValue={medicamento?.nombre}
        error={errores.nombre}
      />
      <CampoTexto
        id={`${prefijo}-dosis`}
        name="dosis"
        etiqueta="Dosis o medida"
        autoComplete="off"
        maxLength={100}
        placeholder="50 mg, 1 comprimido, 10 gotas…"
        defaultValue={medicamento?.dosis}
        error={errores.dosis}
      />
      <div className="sm:col-span-2">
        <CampoTexto
          id={`${prefijo}-indicaciones`}
          name="indicaciones"
          etiqueta="Indicaciones"
          opcional
          autoComplete="off"
          maxLength={500}
          placeholder="Con el desayuno, en ayunas, vía oral…"
          defaultValue={medicamento?.indicaciones}
        />
      </div>

      <div className="sm:col-span-2">
        <CampoCasilla
          id={`${prefijo}-situacional`}
          name="situacional"
          checked={situacional}
          onChange={(e) => setSituacional(e.target.checked)}
        >
          <span className="font-semibold">Situacional</span> (se da solo ante una situación, por
          ejemplo dolor o fiebre)
        </CampoCasilla>
      </div>

      {situacional ? (
        <div className="sm:col-span-2">
          <CampoAreaTexto
            id={`${prefijo}-motivo_situacional`}
            name="motivo_situacional"
            etiqueta="¿Cuándo se administra?"
            rows={2}
            maxLength={500}
            placeholder="Si presenta dolor o fiebre sobre 38 °C"
            defaultValue={medicamento?.motivo_situacional}
            error={errores.motivo_situacional}
          />
        </div>
      ) : (
        <>
          <fieldset
            className="flex flex-col gap-3 sm:col-span-2"
            aria-describedby={errores.horarios ? `${prefijo}-horarios-error` : undefined}
          >
            <legend className="font-semibold">Horas</legend>
            <ul className="flex flex-wrap gap-3">
              {horarios.map((hora, i) => {
                // La primera usa el id del campo "horarios": ahí va el foco si hay un error.
                const idHora = i === 0 ? `${prefijo}-horarios` : `${prefijo}-hora-${i}`;
                return (
                  <li key={i} className="flex items-center gap-1">
                    <label htmlFor={idHora} className="sr-only">
                      Hora {i + 1}
                    </label>
                    <input
                      id={idHora}
                      type="time"
                      name="horario"
                      value={hora}
                      onChange={(e) =>
                        setHorarios((lista) => lista.map((h, j) => (j === i ? e.target.value : h)))
                      }
                      aria-invalid={errores.horarios ? true : undefined}
                      className={`${claseHora} w-36`}
                    />
                    {horarios.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setHorarios((lista) => lista.filter((_, j) => j !== i))}
                        aria-label={`Quitar hora ${i + 1}${hora ? ` (${hora})` : ""}`}
                        className="flex size-11 items-center justify-center rounded-full text-tinta-suave hover:bg-salvia-50"
                      >
                        <X className="size-5" aria-hidden="true" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {horarios.length < MAXIMO_HORARIOS ? (
              <Boton
                variante="secundario"
                className="self-start"
                onClick={() => setHorarios((lista) => [...lista, ""])}
              >
                <Plus className="size-5" aria-hidden="true" />
                Agregar otra hora
              </Boton>
            ) : null}
            {errores.horarios ? (
              <p
                id={`${prefijo}-horarios-error`}
                className="text-base font-semibold text-terracota"
              >
                {errores.horarios}
              </p>
            ) : null}
          </fieldset>

          <fieldset
            id={`${prefijo}-dias`}
            tabIndex={-1}
            className="flex flex-col gap-3 outline-none sm:col-span-2"
            aria-describedby={errores.dias ? `${prefijo}-dias-error` : undefined}
          >
            <legend className="font-semibold">Días</legend>
            <p className="text-base text-tinta-suave">
              Por defecto, todos. Desmarca los que no corresponden (ej: un medicamento semanal).
            </p>
            <SelectorDias prefijo="dia_" marcados={medicamento?.dias ?? DIAS_SEMANA} />
            {errores.dias ? (
              <p id={`${prefijo}-dias-error`} className="text-base font-semibold text-terracota">
                {errores.dias}
              </p>
            ) : null}
          </fieldset>
        </>
      )}

      {estado.estado === "error" && !estado.errores ? (
        <p role="alert" className="flex gap-2 font-semibold text-terracota sm:col-span-2">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {estado.mensaje}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
        <Boton type="submit" disabled={guardando}>
          {guardando ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-5" aria-hidden="true" />
          )}
          {guardando ? "Guardando…" : "Guardar medicamento"}
        </Boton>
        <Boton variante="secundario" onClick={onListo} disabled={guardando}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

/** Resumen de un medicamento en la lista del editor. */
function DetalleMedicamento({ medicamento }: { medicamento: Medicamento }) {
  const dias = diasDelMedicamento(medicamento.dias);
  return (
    <div className="min-w-0">
      <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">
        {medicamento.nombre}{" "}
        <span className="font-normal text-tinta-suave">— {medicamento.dosis}</span>
      </h2>
      {medicamento.situacional ? (
        <p className="mt-1 flex gap-2 [overflow-wrap:anywhere]">
          <Siren className="mt-1 size-4 shrink-0 text-terracota" aria-hidden="true" />
          <span>
            <span className="font-semibold">Situacional. Cuándo: </span>
            {medicamento.motivo_situacional}
          </span>
        </p>
      ) : (
        <p className="mt-1 flex gap-2">
          <Clock className="mt-1 size-4 shrink-0 text-salvia-700" aria-hidden="true" />
          <span className="tabular-nums">
            {medicamento.horarios.join(" · ")}
            {dias ? ` — ${dias}` : null}
          </span>
        </p>
      )}
      {medicamento.indicaciones ? (
        <p className="mt-1 text-base [overflow-wrap:anywhere] text-tinta-suave">
          {medicamento.indicaciones}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Editor de los medicamentos de una ficha: agregar, editar y quitar (con confirmación).
 * Cada cambio queda en la auditoría de la ficha.
 */
export function EditorMedicamentos({
  pacienteId,
  medicamentos,
}: {
  pacienteId: string;
  medicamentos: Medicamento[];
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const cerrar = () => setEditando(null);

  function quitar(id: string) {
    setAviso(null);
    iniciar(async () => {
      const resultado = await quitarMedicamentoAccion(pacienteId, id);
      if (resultado.estado === "error") setAviso(resultado.mensaje);
      setConfirmando(null);
    });
  }

  return (
    <div className="space-y-4">
      {aviso ? (
        <p
          role="alert"
          className="flex gap-2 rounded-xl border-2 border-terracota bg-white p-4 font-semibold text-terracota"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {aviso}
        </p>
      ) : null}

      {medicamentos.length === 0 && editando !== "nuevo" ? (
        <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-6 text-center text-tinta-suave">
          Todavía no tiene medicamentos registrados.
        </p>
      ) : null}

      <ul className="space-y-3" aria-busy={ocupado}>
        {medicamentos.map((medicamento) =>
          editando === medicamento.id ? (
            <li key={medicamento.id}>
              <FormularioMedicamento
                pacienteId={pacienteId}
                medicamento={medicamento}
                onListo={cerrar}
              />
            </li>
          ) : (
            <li key={medicamento.id}>
              <article className="rounded-2xl border border-salvia-200 bg-white p-4 shadow-sm sm:p-5">
                <DetalleMedicamento medicamento={medicamento} />
                {confirmando === medicamento.id ? (
                  <div role="alert" className="mt-4 rounded-xl bg-terracota-claro p-4">
                    <p className="font-semibold">¿Quitar {medicamento.nombre} de la ficha?</p>
                    <p className="mt-1 text-base">Queda registrado en el historial de la ficha.</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Boton
                        onClick={() => quitar(medicamento.id)}
                        disabled={ocupado}
                        className="bg-terracota hover:bg-terracota/90"
                      >
                        <Trash2 className="size-5" aria-hidden="true" />
                        Sí, quitar
                      </Boton>
                      <Boton variante="secundario" onClick={() => setConfirmando(null)}>
                        No, conservar
                      </Boton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
                    <Boton
                      variante="secundario"
                      aria-label={`Editar: ${medicamento.nombre}`}
                      onClick={() => setEditando(medicamento.id)}
                    >
                      <Pencil className="size-5" aria-hidden="true" />
                      Editar
                    </Boton>
                    <Boton
                      variante="secundario"
                      aria-label={`Quitar: ${medicamento.nombre}`}
                      onClick={() => setConfirmando(medicamento.id)}
                    >
                      <Trash2 className="size-5" aria-hidden="true" />
                      Quitar
                    </Boton>
                  </div>
                )}
              </article>
            </li>
          ),
        )}
      </ul>

      {editando === "nuevo" ? (
        <FormularioMedicamento pacienteId={pacienteId} medicamento={null} onListo={cerrar} />
      ) : (
        <Boton onClick={() => setEditando("nuevo")} tamano="grande" className="w-full sm:w-auto">
          <Plus className="size-5" aria-hidden="true" />
          Agregar medicamento
        </Boton>
      )}
    </div>
  );
}
