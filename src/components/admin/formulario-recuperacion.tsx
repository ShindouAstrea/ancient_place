"use client";

import { CircleAlert, LoaderCircle, MailCheck, Send } from "lucide-react";
import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Boton, clasesBoton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo";
import { Turnstile } from "@/components/ui/turnstile";
import { captcha } from "@/lib/env";
import { solicitarRecuperacionAccion } from "@/server/actions/auth";
import {
  esquemaSolicitudRecuperacion,
  type CampoSolicitudRecuperacion,
  type EstadoSolicitudRecuperacion,
} from "@/server/validators/auth";
import { erroresPorCampo } from "@/server/validators/contacto";

const ESTADO_INICIAL: EstadoSolicitudRecuperacion = { estado: "inicial" };

/** "¿Olvidaste tu contraseña?": pide el correo y envía el enlace para elegir una nueva. */
export function FormularioRecuperacion() {
  const [estado, accion, enviando] = useActionState(solicitarRecuperacionAccion, ESTADO_INICIAL);
  const [erroresCliente, setErroresCliente] = useState<Partial<
    Record<CampoSolicitudRecuperacion, string>
  > | null>(null);
  const [avisoCliente, setAvisoCliente] = useState<string | null>(null);
  // Sin CAPTCHA no hay verificación que esperar: el formulario queda listo de inmediato.
  const [turnstile, setTurnstile] = useState<"pendiente" | "listo" | "error">(
    captcha.activo ? "pendiente" : "listo",
  );
  const [reinicioTurnstile, setReinicioTurnstile] = useState(0);

  const refAlerta = useRef<HTMLDivElement>(null);
  const refExito = useRef<HTMLDivElement>(null);

  const errores = erroresCliente ?? (estado.estado === "error" ? (estado.errores ?? {}) : {});
  const mensajeGeneral =
    avisoCliente ?? (estado.estado === "error" && !estado.errores ? estado.mensaje : null);

  useEffect(() => {
    if (estado.estado === "exito") refExito.current?.focus();
    if (estado.estado === "error") {
      if (estado.errores?.email) document.getElementById("email")?.focus();
      else refAlerta.current?.focus();
    }
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const formData = new FormData(evento.currentTarget);
    const validacion = esquemaSolicitudRecuperacion.safeParse({
      email: formData.get("email") ?? "",
    });
    if (!validacion.success) {
      setErroresCliente(erroresPorCampo<CampoSolicitudRecuperacion>(validacion.error));
      setAvisoCliente(null);
      document.getElementById("email")?.focus();
      return;
    }

    if (turnstile !== "listo") {
      setErroresCliente({});
      setAvisoCliente(
        turnstile === "error"
          ? "No pudimos cargar la verificación de seguridad. Recarga la página e inténtalo de nuevo."
          : "Espera un momento a que termine la verificación de seguridad y vuelve a intentarlo.",
      );
      refAlerta.current?.focus();
      return;
    }

    setErroresCliente(null);
    setAvisoCliente(null);
    startTransition(() => accion(formData));
    // El token de Turnstile es de un solo uso: se pide uno nuevo para un reintento.
    setReinicioTurnstile((n) => n + 1);
  }

  if (estado.estado === "exito") {
    return (
      <div
        ref={refExito}
        tabIndex={-1}
        role="region"
        aria-labelledby="recuperacion-exito-titulo"
        className="flex flex-col items-start gap-4 outline-none"
      >
        <MailCheck className="size-12 text-salvia-700" aria-hidden="true" />
        <h1 id="recuperacion-exito-titulo" className="text-3xl font-semibold">
          Revisa tu correo
        </h1>
        <p>
          Si <span className="font-semibold [overflow-wrap:anywhere]">{estado.email}</span>{" "}
          corresponde a una cuenta del panel, te enviamos un enlace para elegir una nueva
          contraseña. Vence en 1 hora y sirve una sola vez.
        </p>
        <p className="text-tinta-suave">
          Si no llega en unos minutos, revisa la carpeta de spam o correo no deseado.
        </p>
        <Link href="/admin/login" className={clasesBoton({ variante: "secundario" })}>
          Volver a ingresar
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-semibold">¿Olvidaste tu contraseña?</h1>
      <p className="mt-2 text-tinta-suave">
        Escribe el correo con el que ingresas al panel y te enviaremos un enlace para elegir una
        nueva.
      </p>
      <form
        onSubmit={alEnviar}
        noValidate
        aria-busy={enviando}
        className="mt-6 flex flex-col gap-5"
      >
        <CampoTexto
          id="email"
          etiqueta="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="username"
          maxLength={254}
          error={errores.email}
          onChange={() => erroresCliente?.email && setErroresCliente(null)}
        />

        {captcha.activo ? (
          <Turnstile
            siteKey={captcha.siteKey}
            accion="recuperacion"
            reinicio={reinicioTurnstile}
            onEstado={setTurnstile}
          />
        ) : null}

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
              <Send className="size-5" aria-hidden="true" />
              Enviar enlace
            </>
          )}
        </Boton>
      </form>
    </>
  );
}
