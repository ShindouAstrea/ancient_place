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
import { CampoCasilla, CampoTexto } from "@/components/ui/campo";
import { CampoContrasena } from "@/components/ui/campo-contrasena";
import { Turnstile } from "@/components/ui/turnstile";
import { captcha } from "@/lib/env";
import {
  credencialGuardada,
  datosRecordados,
  descartarCredencial,
  guardarPreferencia,
  prepararCredencial,
} from "@/lib/utils/recordar-acceso";
import { iniciarSesionAccion } from "@/server/actions/auth";
import {
  esquemaInicioSesion,
  type CampoInicioSesion,
  type EstadoInicioSesion,
} from "@/server/validators/auth";
import { erroresPorCampo } from "@/server/validators/contacto";

const ESTADO_INICIAL: EstadoInicioSesion = { estado: "inicial" };

/**
 * Formulario de ingreso al panel: correo y contraseña. Si todo está bien, el servidor
 * redirige al panel o a `siguiente` (ej: la ficha que abrió un QR).
 */
export function FormularioAcceso({ siguiente }: { siguiente?: string | null }) {
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
  const refCorreo = useRef<HTMLInputElement>(null);
  const refContrasena = useRef<HTMLInputElement>(null);
  const refRecordar = useRef<HTMLInputElement>(null);

  const errores = erroresCliente ?? (estado.estado === "error" ? (estado.errores ?? {}) : {});
  const mensajeGeneral =
    avisoCliente ?? (estado.estado === "error" && !estado.errores ? estado.mensaje : null);

  // «Recordar mis datos»: la preferencia y el correo guardados en este navegador. Se leen
  // al montar (localStorage no existe en el servidor). No pisa lo que ya autocompletó el
  // navegador.
  useEffect(() => {
    const { recordar, correo } = datosRecordados();
    if (refRecordar.current) refRecordar.current.checked = recordar;
    if (refCorreo.current && !refCorreo.current.value) refCorreo.current.value = correo;
    if (!recordar) return;
    // La contraseña la entrega el gestor del navegador, si la persona aceptó guardarla.
    void credencialGuardada().then((credencial) => {
      const campoCorreo = refCorreo.current;
      const campoContrasena = refContrasena.current;
      if (!credencial || !campoCorreo || !campoContrasena) return;
      // No pisa lo que la persona haya escrito mientras tanto.
      if (campoContrasena.value) return;
      if (campoCorreo.value && campoCorreo.value !== correo) return;
      campoCorreo.value = credencial.correo;
      campoContrasena.value = credencial.contrasena;
    });
  }, []);

  // Tras la respuesta del servidor: vaciar la contraseña si era incorrecta y mover el foco.
  useEffect(() => {
    if (estado.estado !== "error") return;
    // El ingreso falló: esa contraseña no se ofrece para guardar.
    descartarCredencial();
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
    const recordar = formData.get("recordar") === "on";
    guardarPreferencia(recordar, validacion.data.email);
    // Se ofrece al gestor de contraseñas recién al llegar al panel (ingreso exitoso).
    if (recordar) prepararCredencial(validacion.data.email, validacion.data.password);
    else descartarCredencial();
    startTransition(() => accion(formData));
    // El token de Turnstile es de un solo uso: se pide uno nuevo para un reintento.
    setReinicioTurnstile((n) => n + 1);
  }

  return (
    <form onSubmit={alEnviar} noValidate aria-busy={enviando} className="flex flex-col gap-5">
      {siguiente ? <input type="hidden" name="siguiente" value={siguiente} /> : null}
      <CampoTexto
        ref={refCorreo}
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

      <div className="flex flex-col gap-1">
        <CampoCasilla ref={refRecordar} id="recordar" aria-describedby="recordar-ayuda">
          Recordar mis datos en este dispositivo
        </CampoCasilla>
        <p id="recordar-ayuda" className="pl-10 text-base text-tinta-suave">
          Guarda tu correo y mantiene la sesión abierta 30 días. Para no volver a escribir la
          contraseña, acepta cuando el navegador ofrezca guardarla. Sin marcarla, la sesión se
          cierra al cerrar el navegador. No la marques en un equipo compartido.
        </p>
      </div>

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
