"use client";

import { CircleAlert, CircleCheck, LoaderCircle, RotateCcw, Send } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { siteConfig } from "@/config/site";
import { Boton, BotonEnlace } from "@/components/ui/boton";
import { CampoAreaTexto, CampoCasilla, CampoSeleccion, CampoTexto } from "@/components/ui/campo";
import { IconoWhatsapp } from "@/components/ui/icono-whatsapp";
import { Turnstile } from "@/components/ui/turnstile";
import { envPublico } from "@/lib/env";
import { enlaceWhatsapp } from "@/lib/utils/contacto";
import { enviarContacto } from "@/server/actions/contacto";
import {
  CAMPO_TRAMPA,
  erroresPorCampo,
  esquemaContacto,
  leerFormularioContacto,
  type CampoContacto,
  type ErroresContacto,
  type EstadoFormularioContacto,
} from "@/server/validators/contacto";

const ORDEN_CAMPOS: CampoContacto[] = [
  "nombre",
  "telefono",
  "email",
  "parentesco",
  "mensaje",
  "consentimiento",
];

const ESTADO_INICIAL: EstadoFormularioContacto = { estado: "inicial" };

const enlaceWhatsappHogar = enlaceWhatsapp(
  siteConfig.contacto.whatsapp,
  siteConfig.contacto.mensajeWhatsappPorDefecto,
);

function enfocarPrimerError(errores: ErroresContacto) {
  const campo = ORDEN_CAMPOS.find((c) => errores[c]);
  if (campo) document.getElementById(campo)?.focus();
}

/**
 * Formulario de contacto. "Enviar otra consulta" vuelve a montar el formulario
 * (cambiando su key) para empezar desde cero con un estado limpio.
 */
export function FormularioContacto({ parentescos }: { parentescos: readonly string[] }) {
  const [instancia, setInstancia] = useState(0);
  return (
    <FormularioInterno
      key={instancia}
      parentescos={parentescos}
      onReiniciar={() => setInstancia((n) => n + 1)}
    />
  );
}

function FormularioInterno({
  parentescos,
  onReiniciar,
}: {
  parentescos: readonly string[];
  onReiniciar: () => void;
}) {
  const [estado, accion, enviando] = useActionState(enviarContacto, ESTADO_INICIAL);
  // Errores detectados en el navegador antes de enviar (respuesta inmediata).
  const [erroresCliente, setErroresCliente] = useState<ErroresContacto | null>(null);
  const [avisoCliente, setAvisoCliente] = useState<string | null>(null);
  const [turnstile, setTurnstile] = useState<"pendiente" | "listo" | "error">("pendiente");
  const [reinicioTurnstile, setReinicioTurnstile] = useState(0);

  const refAlerta = useRef<HTMLDivElement>(null);
  const refExito = useRef<HTMLDivElement>(null);

  const errores: ErroresContacto =
    erroresCliente ?? (estado.estado === "error" ? (estado.errores ?? {}) : {});
  const mensajeGeneral = avisoCliente ?? (estado.estado === "error" ? estado.mensaje : null);

  // Tras la respuesta del servidor, mover el foco para que lectores de pantalla
  // y usuarios de teclado sepan qué ocurrió.
  useEffect(() => {
    if (estado.estado === "exito") {
      refExito.current?.focus();
    } else if (estado.estado === "error") {
      if (estado.errores && Object.keys(estado.errores).length > 0) {
        enfocarPrimerError(estado.errores);
      } else {
        refAlerta.current?.focus();
      }
    }
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    // Se envía manualmente (y no con <form action>) para validar antes en el
    // navegador y para que React no vacíe los campos si el servidor responde error.
    evento.preventDefault();
    if (enviando) return;

    const formData = new FormData(evento.currentTarget);
    const validacion = esquemaContacto.safeParse(leerFormularioContacto(formData));
    if (!validacion.success) {
      const nuevosErrores = erroresPorCampo(validacion.error);
      setErroresCliente(nuevosErrores);
      setAvisoCliente(null);
      enfocarPrimerError(nuevosErrores);
      return;
    }

    if (turnstile !== "listo") {
      setErroresCliente({});
      setAvisoCliente(
        turnstile === "error"
          ? "No pudimos cargar la verificación de seguridad. Recarga la página o escríbenos por WhatsApp."
          : "Espera un momento a que termine la verificación de seguridad y vuelve a intentarlo.",
      );
      refAlerta.current?.focus();
      return;
    }

    setErroresCliente(null);
    setAvisoCliente(null);
    startTransition(() => accion(formData));
    // El token de Turnstile es de un solo uso: se pide uno nuevo para un eventual
    // reintento (el actual ya viaja en formData).
    setReinicioTurnstile((n) => n + 1);
  }

  // Al corregir un campo, su mensaje de error desaparece.
  function alCambiar(evento: FormEvent<HTMLFormElement>) {
    const campo = (evento.target as HTMLInputElement).name as CampoContacto;
    if (erroresCliente?.[campo]) {
      const restantes = { ...erroresCliente };
      delete restantes[campo];
      setErroresCliente(restantes);
    }
  }

  if (estado.estado === "exito") {
    return (
      <div
        ref={refExito}
        tabIndex={-1}
        className="flex flex-col items-start gap-4 outline-none"
        aria-labelledby="contacto-exito-titulo"
        role="region"
      >
        <CircleCheck className="size-12 text-salvia-700" aria-hidden="true" />
        <h3 id="contacto-exito-titulo" className="text-2xl font-semibold">
          ¡Gracias! Recibimos tu solicitud
        </h3>
        <p>
          Te contactaremos a la brevedad por teléfono, WhatsApp o correo. Si tu consulta es urgente,
          escríbenos directamente por WhatsApp.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <BotonEnlace href={enlaceWhatsappHogar} externo variante="whatsapp">
            <IconoWhatsapp className="size-5" />
            Escribir por WhatsApp
          </BotonEnlace>
          <Boton variante="secundario" onClick={onReiniciar}>
            <RotateCcw className="size-5" aria-hidden="true" />
            Enviar otra consulta
          </Boton>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={alEnviar}
      onChange={alCambiar}
      noValidate
      aria-busy={enviando}
      aria-describedby="nota-requeridos"
      className="relative flex flex-col gap-6"
    >
      <p id="nota-requeridos" className="text-base text-tinta-suave">
        Todos los campos son obligatorios, salvo que se indique lo contrario.
      </p>

      <CampoTexto
        id="nombre"
        etiqueta="Nombre completo"
        autoComplete="name"
        maxLength={100}
        error={errores.nombre}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <CampoTexto
          id="telefono"
          etiqueta="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+56 9 1234 5678"
          maxLength={20}
          error={errores.telefono}
        />
        <CampoTexto
          id="email"
          etiqueta="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="nombre@correo.cl"
          maxLength={254}
          error={errores.email}
        />
      </div>

      <CampoSeleccion
        id="parentesco"
        etiqueta="Parentesco con el adulto mayor"
        opcional
        opciones={parentescos}
        error={errores.parentesco}
      />

      <CampoAreaTexto
        id="mensaje"
        etiqueta="Mensaje"
        ayuda="Cuéntanos brevemente sobre tu familiar y qué necesitan. Por favor, no incluyas información médica."
        maxLength={2000}
        error={errores.mensaje}
      />

      <CampoCasilla id="consentimiento" required error={errores.consentimiento}>
        Acepto que mis datos sean usados para contactarme, según la{" "}
        <Link href="/privacidad" className="font-semibold text-salvia-800 underline">
          política de privacidad
        </Link>
        .
      </CampoCasilla>

      {/* Honeypot: fuera de la pantalla y fuera del orden de tabulación. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor={CAMPO_TRAMPA}>No completes este campo</label>
        <input
          id={CAMPO_TRAMPA}
          name={CAMPO_TRAMPA}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="flex flex-col gap-1">
        <Turnstile
          siteKey={envPublico.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          accion="contacto"
          reinicio={reinicioTurnstile}
          onEstado={setTurnstile}
        />
      </div>

      {/* Región de avisos: role="alert" anuncia el error a lectores de pantalla. */}
      <div ref={refAlerta} tabIndex={-1} className="outline-none" role="alert">
        {mensajeGeneral ? (
          <div className="flex gap-3 rounded-xl border-2 border-terracota bg-white p-4 text-base">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
            <p>
              {mensajeGeneral}{" "}
              {!erroresCliente && estado.estado === "error" && !estado.errores ? (
                <a
                  href={enlaceWhatsappHogar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-salvia-800 underline"
                >
                  Abrir WhatsApp
                </a>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>

      <Boton
        type="submit"
        tamano="grande"
        disabled={enviando}
        className="w-full sm:w-auto sm:self-start"
      >
        {enviando ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Enviando…
          </>
        ) : (
          <>
            <Send className="size-5" aria-hidden="true" />
            Enviar solicitud
          </>
        )}
      </Boton>
    </form>
  );
}
