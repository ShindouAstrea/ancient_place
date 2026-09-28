"use client";

import { CircleAlert, LoaderCircle, LogIn, MailCheck } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo";
import { Turnstile } from "@/components/ui/turnstile";
import { envPublico } from "@/lib/env";
import { solicitarAcceso } from "@/server/actions/auth";
import { esquemaSolicitudAcceso, type EstadoSolicitudAcceso } from "@/server/validators/auth";

const ESTADO_INICIAL: EstadoSolicitudAcceso = { estado: "inicial" };

/** "Solicitar otro enlace" vuelve a montar el formulario con un estado limpio. */
export function FormularioAcceso() {
  const [instancia, setInstancia] = useState(0);
  return <FormularioInterno key={instancia} onReiniciar={() => setInstancia((n) => n + 1)} />;
}

function FormularioInterno({ onReiniciar }: { onReiniciar: () => void }) {
  const [estado, accion, enviando] = useActionState(solicitarAcceso, ESTADO_INICIAL);
  const [errorCliente, setErrorCliente] = useState<string | null>(null);
  const [avisoCliente, setAvisoCliente] = useState<string | null>(null);
  const [turnstile, setTurnstile] = useState<"pendiente" | "listo" | "error">("pendiente");
  const [reinicioTurnstile, setReinicioTurnstile] = useState(0);

  const refAlerta = useRef<HTMLDivElement>(null);
  const refEnviado = useRef<HTMLDivElement>(null);

  const errorEmail = errorCliente ?? (estado.estado === "error" ? estado.errorEmail : undefined);
  const mensajeGeneral =
    avisoCliente ?? (estado.estado === "error" && !estado.errorEmail ? estado.mensaje : null);

  // Tras la respuesta del servidor, mover el foco para anunciar el resultado.
  useEffect(() => {
    if (estado.estado === "enviado") refEnviado.current?.focus();
    if (estado.estado === "error") {
      if (estado.errorEmail) document.getElementById("email")?.focus();
      else refAlerta.current?.focus();
    }
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const formData = new FormData(evento.currentTarget);
    const validacion = esquemaSolicitudAcceso.safeParse({ email: formData.get("email") ?? "" });
    if (!validacion.success) {
      setErrorCliente(validacion.error.issues[0]?.message ?? "Ingresa un correo válido.");
      setAvisoCliente(null);
      document.getElementById("email")?.focus();
      return;
    }

    if (turnstile !== "listo") {
      setErrorCliente(null);
      setAvisoCliente(
        turnstile === "error"
          ? "No pudimos cargar la verificación de seguridad. Recarga la página e inténtalo de nuevo."
          : "Espera un momento a que termine la verificación de seguridad y vuelve a intentarlo.",
      );
      refAlerta.current?.focus();
      return;
    }

    setErrorCliente(null);
    setAvisoCliente(null);
    startTransition(() => accion(formData));
    // El token de Turnstile es de un solo uso: se pide uno nuevo para un reintento.
    setReinicioTurnstile((n) => n + 1);
  }

  if (estado.estado === "enviado") {
    return (
      <div
        ref={refEnviado}
        tabIndex={-1}
        role="region"
        aria-labelledby="acceso-enviado-titulo"
        className="flex flex-col items-start gap-4 outline-none"
      >
        <MailCheck className="size-12 text-salvia-700" aria-hidden="true" />
        <h2 id="acceso-enviado-titulo" className="text-2xl font-semibold">
          Revisa tu correo
        </h2>
        {/* Mensaje idéntico exista o no la cuenta: no revela qué correos tienen acceso. */}
        <p>
          Si el correo tiene acceso al panel, te enviamos un enlace para entrar. El enlace vence en
          15 minutos y sirve una sola vez.
        </p>
        <p className="text-base text-tinta-suave">
          ¿No llegó? Revisa la carpeta de spam o solicita otro enlace en unos minutos.
        </p>
        <Boton variante="secundario" onClick={onReiniciar}>
          Solicitar otro enlace
        </Boton>
      </div>
    );
  }

  return (
    <form onSubmit={alEnviar} noValidate aria-busy={enviando} className="flex flex-col gap-5">
      <CampoTexto
        id="email"
        etiqueta="Correo electrónico"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={254}
        error={errorEmail}
        onChange={() => errorCliente && setErrorCliente(null)}
      />

      <Turnstile
        siteKey={envPublico.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        accion="login"
        reinicio={reinicioTurnstile}
        onEstado={setTurnstile}
      />

      <div ref={refAlerta} tabIndex={-1} role="alert" className="outline-none">
        {mensajeGeneral ? (
          <p className="flex gap-3 rounded-xl border-2 border-terracota bg-white p-4 text-base">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
            {mensajeGeneral}
          </p>
        ) : null}
      </div>

      <Boton type="submit" tamano="grande" disabled={enviando} className="w-full">
        {enviando ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Enviando…
          </>
        ) : (
          <>
            <LogIn className="size-5" aria-hidden="true" />
            Enviarme el enlace
          </>
        )}
      </Boton>
    </form>
  );
}
