"use client";

import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  CircleCheck,
  ImagePlus,
  LoaderCircle,
  Save,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo";
import { urlFoto } from "@/lib/utils/fotos";
import { prepararImagen } from "@/lib/utils/imagen-navegador";
import {
  eliminarFoto,
  eliminarFotoPortada,
  guardarTextoFoto,
  guardarTextoPortada,
  moverElemento,
  subirFotoGaleria,
  subirFotoPortada,
} from "@/server/actions/contenido";
import type { EstadoEdicion } from "@/server/validators/contenido";
import type { Foto } from "@/types/contenido";

const INICIAL: EstadoEdicion = { estado: "inicial" };
type Accion = (estado: EstadoEdicion, formData: FormData) => Promise<EstadoEdicion>;

function Mensaje({ estado }: { estado: EstadoEdicion }) {
  if (estado.estado === "exito") {
    return (
      <p className="flex items-center gap-2 font-semibold text-salvia-800">
        <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
        {estado.mensaje}
      </p>
    );
  }
  if (estado.estado === "error") {
    return (
      <p className="flex items-center gap-2 font-semibold text-terracota">
        <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
        {estado.mensaje}
      </p>
    );
  }
  return null;
}

/**
 * Subida de una foto: elegir archivo, vista previa, descripción (texto alternativo)
 * y envío. La foto se reduce y convierte en el navegador antes de subirla.
 */
export function SubidorFoto({ accion, textoBoton }: { accion: Accion; textoBoton: string }) {
  // Tras subir con éxito se vuelve a montar el subidor (formulario y vista previa limpios)
  // y el mensaje de éxito se conserva aquí hasta que se elija otra foto.
  const [instancia, setInstancia] = useState(0);
  const [mensaje, setMensaje] = useState<string | null>(null);
  return (
    <SubidorInterno
      key={instancia}
      accion={accion}
      textoBoton={textoBoton}
      mensajeAnterior={mensaje}
      onSubido={(texto) => {
        setMensaje(texto);
        setInstancia((n) => n + 1);
      }}
      onLimpiarMensaje={() => setMensaje(null)}
    />
  );
}

function SubidorInterno({
  accion,
  textoBoton,
  mensajeAnterior,
  onSubido,
  onLimpiarMensaje,
}: {
  accion: Accion;
  textoBoton: string;
  mensajeAnterior: string | null;
  onSubido: (mensaje: string) => void;
  onLimpiarMensaje: () => void;
}) {
  const id = useId();
  const [estado, enviar, subiendo] = useActionState(accion, INICIAL);
  const [preparando, setPreparando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const refArchivo = useRef<HTMLInputElement>(null);
  const errores = estado.estado === "error" ? (estado.errores ?? {}) : {};
  const ocupado = preparando || subiendo;

  useEffect(() => {
    if (estado.estado === "exito") onSubido(estado.mensaje);
  }, [estado, onSubido]);

  useEffect(
    () => () => (vistaPrevia ? URL.revokeObjectURL(vistaPrevia) : undefined),
    [vistaPrevia],
  );

  function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    setErrorLocal(null);
    onLimpiarMensaje();
    setVistaPrevia(archivo ? URL.createObjectURL(archivo) : null);
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ocupado) return;
    const original = refArchivo.current?.files?.[0];
    if (!original) {
      setErrorLocal("Elige una foto.");
      return;
    }
    const alt = new FormData(evento.currentTarget).get("alt")?.toString() ?? "";

    setPreparando(true);
    try {
      const { archivo, ancho, alto } = await prepararImagen(original);
      const datos = new FormData();
      datos.set("archivo", archivo, archivo.type === "image/webp" ? "foto.webp" : "foto.jpg");
      datos.set("alt", alt);
      datos.set("ancho", String(ancho));
      datos.set("alto", String(alto));
      startTransition(() => enviar(datos));
    } catch {
      setErrorLocal("No pudimos procesar esa imagen. Prueba con otra foto (JPG o PNG).");
    } finally {
      setPreparando(false);
    }
  }

  const errorArchivo = errorLocal ?? errores.archivo;

  return (
    <form onSubmit={alEnviar} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-archivo`} className="font-semibold">
          Foto
        </label>
        <input
          ref={refArchivo}
          id={`${id}-archivo`}
          name="archivo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={alElegir}
          aria-invalid={errorArchivo ? true : undefined}
          aria-describedby={errorArchivo ? `${id}-archivo-error` : undefined}
          className="block w-full rounded-xl border-2 border-dashed border-salvia-300 bg-white p-3 text-base file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-salvia-700 file:px-4 file:font-semibold file:text-white"
        />
        {errorArchivo ? (
          <p id={`${id}-archivo-error`} className="text-base font-semibold text-terracota">
            {errorArchivo}
          </p>
        ) : null}
      </div>

      {vistaPrevia ? (
        // Vista previa local (blob:), antes de subir: no pasa por next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vistaPrevia} alt="" className="max-h-60 w-auto self-start rounded-xl" />
      ) : null}

      <CampoTexto
        id={`${id}-alt`}
        name="alt"
        etiqueta="Descripción de la foto"
        ayuda="Qué se ve en la foto, ej: «Comedor iluminado con mesas para cuatro personas». La leen las personas con discapacidad visual."
        maxLength={200}
        error={errores.alt}
        autoComplete="off"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Boton type="submit" disabled={ocupado} className="w-full sm:w-auto">
          {ocupado ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-5" aria-hidden="true" />
          )}
          {preparando ? "Preparando foto…" : subiendo ? "Subiendo…" : textoBoton}
        </Boton>
        <div aria-live="polite">
          {ocupado ? null : estado.estado === "error" && !estado.errores ? (
            <Mensaje estado={estado} />
          ) : mensajeAnterior ? (
            <Mensaje estado={{ estado: "exito", mensaje: mensajeAnterior }} />
          ) : null}
        </div>
      </div>
    </form>
  );
}

/** Edición de la descripción (texto alternativo) de una foto ya subida. */
function EditorTexto({ accion, id, alt }: { accion: Accion; id?: string; alt: string }) {
  const idCampo = useId();
  const [estado, enviar, guardando] = useActionState(accion, INICIAL);
  const errores = estado.estado === "error" ? (estado.errores ?? {}) : {};

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    startTransition(() => enviar(formData));
  }

  return (
    <form onSubmit={alEnviar} noValidate className="flex flex-col gap-3">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <CampoTexto
        id={idCampo}
        name="alt"
        etiqueta="Descripción"
        defaultValue={alt}
        maxLength={200}
        error={errores.alt}
        autoComplete="off"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Boton type="submit" variante="secundario" disabled={guardando}>
          <Save className="size-5" aria-hidden="true" />
          {guardando ? "Guardando…" : "Guardar descripción"}
        </Boton>
        <div aria-live="polite">
          {!guardando && !(estado.estado === "error" && estado.errores) ? (
            <Mensaje estado={estado} />
          ) : null}
        </div>
      </div>
    </form>
  );
}

/** Foto de portada: vista actual, reemplazo, descripción y opción de quitarla. */
export function FotoPortada({
  ruta,
  alt,
  ancho,
  alto,
}: {
  ruta: string | null;
  alt: string;
  ancho: number | null;
  alto: number | null;
}) {
  const [ocupado, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {ruta && ancho && alto ? (
        <div className="flex flex-col gap-4">
          <Image
            src={urlFoto(ruta)}
            alt={alt}
            width={ancho}
            height={alto}
            sizes="(min-width: 640px) 480px, 100vw"
            className="h-auto w-full max-w-md rounded-xl"
          />
          <EditorTexto accion={guardarTextoPortada} alt={alt} />
          {confirmando ? (
            <div role="alert" className="rounded-xl bg-terracota-claro p-4">
              <p className="font-semibold">¿Quitar la foto de portada?</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Boton
                  onClick={() => iniciar(async () => void (await eliminarFotoPortada()))}
                  disabled={ocupado}
                  className="bg-terracota hover:bg-terracota/90"
                >
                  <Trash2 className="size-5" aria-hidden="true" />
                  Sí, quitar
                </Boton>
                <Boton variante="secundario" onClick={() => setConfirmando(false)}>
                  No
                </Boton>
              </div>
            </div>
          ) : (
            <Boton
              variante="secundario"
              onClick={() => setConfirmando(true)}
              className="self-start"
            >
              <Trash2 className="size-5" aria-hidden="true" />
              Quitar foto de portada
            </Boton>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-salvia-300 bg-white p-4 text-tinta-suave">
          Sin foto de portada: la portada muestra solo el texto.
        </p>
      )}
      <div>
        <h3 className="mb-3 text-lg font-semibold">
          {ruta ? "Reemplazar la foto de portada" : "Subir foto de portada"}
        </h3>
        <SubidorFoto accion={subirFotoPortada} textoBoton="Guardar foto de portada" />
      </div>
    </div>
  );
}

/** Galería de "Nuestras instalaciones": lista con orden, descripción y eliminación. */
export function GaleriaFotos({ fotos }: { fotos: Foto[] }) {
  const [ocupado, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function ejecutar(accion: () => Promise<EstadoEdicion>) {
    setAviso(null);
    iniciar(async () => {
      const resultado = await accion();
      if (resultado.estado === "error") setAviso(resultado.mensaje);
      setConfirmando(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {aviso ? (
        <p
          role="alert"
          className="flex gap-2 rounded-xl border-2 border-terracota bg-white p-4 font-semibold text-terracota"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {aviso}
        </p>
      ) : null}

      {fotos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-6 text-center text-tinta-suave">
          Todavía no hay fotos: la sección «Nuestras instalaciones» no se muestra en el sitio.
        </p>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2" aria-busy={ocupado}>
          {fotos.map((foto, i) => (
            <li
              key={foto.id}
              className="flex flex-col gap-3 rounded-2xl border border-salvia-200 bg-white p-4 shadow-sm"
            >
              <Image
                src={urlFoto(foto.ruta)}
                alt={foto.alt}
                width={foto.ancho}
                height={foto.alto}
                sizes="(min-width: 640px) 440px, 100vw"
                className="aspect-[4/3] h-auto w-full rounded-xl object-cover"
              />
              <EditorTexto accion={guardarTextoFoto} id={foto.id} alt={foto.alt} />
              {confirmando === foto.id ? (
                <div role="alert" className="rounded-xl bg-terracota-claro p-4">
                  <p className="font-semibold">¿Eliminar esta foto? No se puede deshacer.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Boton
                      onClick={() => ejecutar(() => eliminarFoto(foto.id))}
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
                <div className="grid grid-cols-3 gap-2">
                  {/* Botones solo con ícono: aria-label con la acción y la foto. */}
                  <Boton
                    variante="secundario"
                    aria-label={`Mover antes: ${foto.alt}`}
                    disabled={i === 0 || ocupado}
                    onClick={() => ejecutar(() => moverElemento("fotos", foto.id, "arriba"))}
                  >
                    <ArrowUp className="size-5" aria-hidden="true" />
                  </Boton>
                  <Boton
                    variante="secundario"
                    aria-label={`Mover después: ${foto.alt}`}
                    disabled={i === fotos.length - 1 || ocupado}
                    onClick={() => ejecutar(() => moverElemento("fotos", foto.id, "abajo"))}
                  >
                    <ArrowDown className="size-5" aria-hidden="true" />
                  </Boton>
                  <Boton
                    variante="secundario"
                    aria-label={`Eliminar: ${foto.alt}`}
                    onClick={() => setConfirmando(foto.id)}
                  >
                    <Trash2 className="size-5" aria-hidden="true" />
                  </Boton>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <div className="rounded-2xl border-2 border-salvia-300 bg-white p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold">Agregar una foto a la galería</h3>
        <SubidorFoto accion={subirFotoGaleria} textoBoton="Subir foto" />
      </div>
    </div>
  );
}
