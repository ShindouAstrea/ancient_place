"use client";

import { CircleAlert, LoaderCircle, LogIn } from "lucide-react";
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
import { CampoContrasena } from "@/components/ui/campo-contrasena";
import { Turnstile } from "@/components/ui/turnstile";
import { captcha } from "@/lib/env";
import { iniciarSesionAccion } from "@/server/actions/auth";
import {
  esquemaInicioSesion,
  type CampoInicioSesion,
  type EstadoInicioSesion,
} from "@/server/validators/auth";
import { erroresPorCampo } from "@/server/validators/contacto";

const ESTADO_INICIAL: EstadoInicioSesion = { estado: "inicial" };

/** Formulario de ingreso al panel: correo y contraseña. Si todo está bien, el servidor redirige. */
export function FormularioAcceso() {
  const [estado, accion, enviando] = useActionState(iniciarSesionAccion, ESTADO_INICIAL);
  const [erroresCliente, setErroresCliente] = useState<Partial<
    Record<CampoInicioSesion, string>
  > | null>(null);
  const [avisoCliente, setAvisoCliente] = useState<string | null>(null);
  // Sin CAPTCHA no hay verificación que esperar: el formulario queda listo de inmediato.
  const [turnstile, setTurnstile] = useState<"pendiente" | "listo" | "error">(
    captcha.activo ? "pendiente" : "listo",
  );
  const [reinicioTurnstile, setReinicioTurnstile] = useState(0);

  const refAlerta = useRef<HTMLDivElement>(null);
  const refContrasena = useRef<HTMLInputElement>(null);

  const errores = erroresCliente ?? (estado.estado === "error" ? (estado.errores ?? {}) : {});
  const mensajeGeneral =
    avisoCliente ?? (estado.estado === "error" && !estado.errores ? estado.mensaje : null);

  // Tras la respuesta del servidor: vaciar la contraseña si era incorrecta y mover el foco.
  useEffect(() => {
    if (estado.estado !== "error") return;
    if (estado.limpiarContrasena && refContrasena.current) {
      refContrasena.current.value = "";
      refContrasena.current.focus();
    } else if (estado.errores?.email) {
      document.getElementById("email")?.focus();
    } else if (estado.errores?.password) {
      refContrasena.current?.focus();
    } else {
      refAlerta.current?.focus();
    }
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const formData = new FormData(evento.currentTarget);
    const validacion = esquemaInicioSesion.safeParse({
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
    });
    if (!validacion.success) {
      const nuevos = erroresPorCampo<CampoInicioSesion>(validacion.error);
      setErroresCliente(nuevos);
      setAvisoCliente(null);
      if (nuevos.email) document.getElementById("email")?.focus();
      else refContrasena.current?.focus();
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

  return (
    <form onSubmit={alEnviar} noValidate aria-busy={enviando} className="flex flex-col gap-5">
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

      <CampoContrasena
        ref={refContrasena}
        id="password"
        etiqueta="Contraseña"
        autoComplete="current-password"
        error={errores.password}
        onChange={() => erroresCliente?.password && setErroresCliente(null)}
      />

      {captcha.activo ? (
        <Turnstile
          siteKey={captcha.siteKey}
          accion="login"
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
            Ingresando…
          </>
        ) : (
          <>
            <LogIn className="size-5" aria-hidden="true" />
            Ingresar
          </>
        )}
      </Boton>
    </form>
  );
}
