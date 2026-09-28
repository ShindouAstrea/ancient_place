"use client";

import { CircleAlert, CircleCheck, KeyRound, LoaderCircle } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Boton } from "@/components/ui/boton";
import { CampoContrasena } from "@/components/ui/campo-contrasena";
import { Turnstile } from "@/components/ui/turnstile";
import { captcha } from "@/lib/env";
import { cambiarContrasenaAccion } from "@/server/actions/auth";
import {
  LARGO_MINIMO_CONTRASENA,
  esquemaCambioContrasena,
  type CampoCambioContrasena,
  type EstadoCambioContrasena,
} from "@/server/validators/auth";
import { erroresPorCampo } from "@/server/validators/contacto";

const ESTADO_INICIAL: EstadoCambioContrasena = { estado: "inicial" };
const ORDEN_CAMPOS: CampoCambioContrasena[] = ["actual", "nueva", "repetir"];

function enfocarPrimerError(errores: Partial<Record<CampoCambioContrasena, string>>) {
  const campo = ORDEN_CAMPOS.find((c) => errores[c]);
  if (campo) document.getElementById(campo)?.focus();
}

/** Tras un cambio exitoso, "Aceptar" vuelve a montar el formulario vacío. */
export function FormularioContrasena() {
  const [instancia, setInstancia] = useState(0);
  return <FormularioInterno key={instancia} onReiniciar={() => setInstancia((n) => n + 1)} />;
}

function FormularioInterno({ onReiniciar }: { onReiniciar: () => void }) {
  const [estado, accion, enviando] = useActionState(cambiarContrasenaAccion, ESTADO_INICIAL);
  const [erroresCliente, setErroresCliente] = useState<Partial<
    Record<CampoCambioContrasena, string>
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
      if (estado.errores) enfocarPrimerError(estado.errores);
      else refAlerta.current?.focus();
    }
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const formData = new FormData(evento.currentTarget);
    const validacion = esquemaCambioContrasena.safeParse({
      actual: formData.get("actual") ?? "",
      nueva: formData.get("nueva") ?? "",
      repetir: formData.get("repetir") ?? "",
    });
    if (!validacion.success) {
      const nuevos = erroresPorCampo<CampoCambioContrasena>(validacion.error);
      setErroresCliente(nuevos);
      setAvisoCliente(null);
      enfocarPrimerError(nuevos);
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

  // Al corregir un campo, su mensaje de error desaparece.
  function limpiarError(campo: CampoCambioContrasena) {
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
        role="region"
        aria-labelledby="contrasena-exito-titulo"
        className="flex flex-col items-start gap-4 outline-none"
      >
        <CircleCheck className="size-12 text-salvia-700" aria-hidden="true" />
        <h3 id="contrasena-exito-titulo" className="text-2xl font-semibold">
          Contraseña actualizada
        </h3>
        <p>
          Desde ahora ingresa con tu nueva contraseña. Por seguridad, cerramos la sesión en tus
          otros dispositivos; este sigue conectado.
        </p>
        <Boton variante="secundario" onClick={onReiniciar}>
          Aceptar
        </Boton>
      </div>
    );
  }

  return (
    <form onSubmit={alEnviar} noValidate aria-busy={enviando} className="flex flex-col gap-5">
      <CampoContrasena
        id="actual"
        etiqueta="Contraseña actual"
        autoComplete="current-password"
        error={errores.actual}
        onChange={() => limpiarError("actual")}
      />
      <CampoContrasena
        id="nueva"
        etiqueta="Nueva contraseña"
        autoComplete="new-password"
        ayuda={`Al menos ${LARGO_MINIMO_CONTRASENA} caracteres. Una frase fácil de recordar funciona bien, por ejemplo: «el-cafe-de-la-tarde-2026».`}
        error={errores.nueva}
        onChange={() => limpiarError("nueva")}
      />
      <CampoContrasena
        id="repetir"
        etiqueta="Repite la nueva contraseña"
        autoComplete="new-password"
        error={errores.repetir}
        onChange={() => limpiarError("repetir")}
      />

      {captcha.activo ? (
        <Turnstile
          siteKey={captcha.siteKey}
          accion="cuenta"
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

      <Boton
        type="submit"
        tamano="grande"
        disabled={enviando}
        className="w-full sm:w-auto sm:self-start"
      >
        {enviando ? (
          <>
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Guardando…
          </>
        ) : (
          <>
            <KeyRound className="size-5" aria-hidden="true" />
            Cambiar contraseña
          </>
        )}
      </Boton>
    </form>
  );
}
