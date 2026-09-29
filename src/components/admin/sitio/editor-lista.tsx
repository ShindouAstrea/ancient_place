"use client";

import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
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
import { Icono } from "@/components/ui/icono";
import { cn } from "@/lib/utils/cn";
import { eliminarElemento, guardarElemento, moverElemento } from "@/server/actions/contenido";
import type { EstadoEdicion } from "@/server/validators/contenido";
import type { TipoLista } from "@/types/contenido";

import { CampoEditable } from "./campo-editable";
import type { CampoEditable as Definicion } from "./definiciones";

export type ElementoEditable = { id: string; valores: Record<string, string> };

type Props = {
  tipo: TipoLista;
  campos: Definicion[];
  elementos: ElementoEditable[];
  singular: string;
  textoAgregar: string;
  campoTitulo: string;
  campoDetalle: string;
};

const INICIAL: EstadoEdicion = { estado: "inicial" };

/** Formulario para crear (sin id) o editar un elemento. */
function FormularioElemento({
  tipo,
  campos,
  elemento,
  onListo,
}: {
  tipo: TipoLista;
  campos: Definicion[];
  elemento: ElementoEditable | null;
  onListo: () => void;
}) {
  const [estado, enviar, guardando] = useActionState(guardarElemento.bind(null, tipo), INICIAL);
  const errores = estado.estado === "error" ? (estado.errores ?? {}) : {};
  const prefijo = `${tipo}-${elemento?.id ?? "nuevo"}`;

  // Al guardar con éxito se cierra el formulario (la lista ya se actualizó).
  useEffect(() => {
    if (estado.estado === "exito") onListo();
  }, [estado, onListo]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    const formData = new FormData(evento.currentTarget);
    startTransition(() => enviar(formData));
  }

  return (
    <form
      onSubmit={alEnviar}
      noValidate
      aria-busy={guardando}
      className="grid gap-5 rounded-2xl border-2 border-salvia-300 bg-white p-4 sm:grid-cols-2 sm:p-6"
    >
      {elemento ? <input type="hidden" name="id" value={elemento.id} /> : null}
      {campos.map((campo) => (
        <div key={campo.nombre} className={cn(!campo.medio && "sm:col-span-2")}>
          <CampoEditable
            campo={campo}
            valor={elemento?.valores[campo.nombre] ?? ""}
            error={errores[campo.nombre]}
            prefijo={prefijo}
          />
        </div>
      ))}
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
          {guardando ? "Guardando…" : "Guardar"}
        </Boton>
        <Boton variante="secundario" onClick={onListo} disabled={guardando}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

/**
 * Editor de una lista del sitio (servicios, razones, testimonios o preguntas):
 * agregar, editar, cambiar el orden y eliminar (con confirmación en la misma tarjeta).
 */
export function EditorLista({
  tipo,
  campos,
  elementos,
  singular,
  textoAgregar,
  campoTitulo,
  campoDetalle,
}: Props) {
  const [editando, setEditando] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const tieneIcono = campos.some((c) => c.tipo === "icono");
  const cerrar = () => setEditando(null);

  function ejecutar(accion: () => Promise<EstadoEdicion>) {
    setAviso(null);
    iniciar(async () => {
      const resultado = await accion();
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

      {elementos.length === 0 && editando !== "nuevo" ? (
        <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-6 text-center text-tinta-suave">
          Todavía no hay elementos: la sección no se muestra en el sitio.
        </p>
      ) : null}

      <ol className="space-y-3" aria-busy={ocupado}>
        {elementos.map((elemento, i) => {
          const titulo = elemento.valores[campoTitulo] ?? "";
          if (editando === elemento.id) {
            return (
              <li key={elemento.id}>
                <FormularioElemento
                  tipo={tipo}
                  campos={campos}
                  elemento={elemento}
                  onListo={cerrar}
                />
              </li>
            );
          }
          return (
            <li key={elemento.id}>
              <article className="rounded-2xl border border-salvia-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex gap-3">
                  {tieneIcono ? (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-salvia-100 text-salvia-700">
                      <Icono nombre={elemento.valores.icono ?? ""} className="size-6" />
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{titulo}</h2>
                    {elemento.valores[campoDetalle] ? (
                      <p className="mt-1 line-clamp-3 text-base [overflow-wrap:anywhere] whitespace-pre-line text-tinta-suave">
                        {elemento.valores[campoDetalle]}
                      </p>
                    ) : null}
                  </div>
                </div>

                {confirmando === elemento.id ? (
                  <div role="alert" className="mt-4 rounded-xl bg-terracota-claro p-4">
                    <p className="font-semibold">
                      ¿Eliminar este {singular}? Esta acción no se puede deshacer.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Boton
                        onClick={() => ejecutar(() => eliminarElemento(tipo, elemento.id))}
                        disabled={ocupado}
                        className="bg-terracota hover:bg-terracota/90"
                      >
                        <Trash2 className="size-5" aria-hidden="true" />
                        Sí, eliminar
                      </Boton>
                      <Boton variante="secundario" onClick={() => setConfirmando(null)}>
                        No, conservar
                      </Boton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {/* aria-label incluye el texto visible + a qué elemento se refiere. */}
                    <Boton
                      variante="secundario"
                      aria-label={`Editar: ${titulo}`}
                      onClick={() => setEditando(elemento.id)}
                    >
                      <Pencil className="size-5" aria-hidden="true" />
                      Editar
                    </Boton>
                    <Boton
                      variante="secundario"
                      aria-label={`Eliminar: ${titulo}`}
                      onClick={() => setConfirmando(elemento.id)}
                    >
                      <Trash2 className="size-5" aria-hidden="true" />
                      Eliminar
                    </Boton>
                    <Boton
                      variante="secundario"
                      aria-label={`Subir: ${titulo}`}
                      disabled={i === 0 || ocupado}
                      onClick={() => ejecutar(() => moverElemento(tipo, elemento.id, "arriba"))}
                    >
                      <ArrowUp className="size-5" aria-hidden="true" />
                      Subir
                    </Boton>
                    <Boton
                      variante="secundario"
                      aria-label={`Bajar: ${titulo}`}
                      disabled={i === elementos.length - 1 || ocupado}
                      onClick={() => ejecutar(() => moverElemento(tipo, elemento.id, "abajo"))}
                    >
                      <ArrowDown className="size-5" aria-hidden="true" />
                      Bajar
                    </Boton>
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ol>

      {editando === "nuevo" ? (
        <FormularioElemento tipo={tipo} campos={campos} elemento={null} onListo={cerrar} />
      ) : (
        <Boton onClick={() => setEditando("nuevo")} tamano="grande" className="w-full sm:w-auto">
          <Plus className="size-5" aria-hidden="true" />
          {textoAgregar}
        </Boton>
      )}
    </div>
  );
}
