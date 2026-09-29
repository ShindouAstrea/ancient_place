"use client";

import { CircleAlert, KeyRound, LoaderCircle, LogIn, MailWarning, Send } from "lucide-react";
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
import { CampoContrasena } from "@/components/ui/campo-contrasena";
import { restablecerContrasenaAccion } from "@/server/actions/auth";
import {
  LARGO_MINIMO_CONTRASENA,
  esquemaRestablecimiento,
  type CampoRestablecimiento,
  type EstadoRestablecimiento,
} from "@/server/validators/auth";
import { erroresPorCampo } from "@/server/validators/contacto";

const ESTADO_INICIAL: EstadoRestablecimiento = { estado: "inicial" };
const ORDEN_CAMPOS: CampoRestablecimiento[] = ["nueva", "repetir"];

function enfocarPrimerError(errores: Partial<Record<CampoRestablecimiento, string>>) {
  const campo = ORDEN_CAMPOS.find((c) => errores[c]);
  if (campo) document.getElementById(campo)?.focus();
}

/** Enlace vencido, ya usado o incompleto: se ofrece pedir uno nuevo. */
export function EnlaceNoValido({ mensaje }: { mensaje?: string }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <MailWarning className="size-12 text-terracota" aria-hidden="true" />
      <h1 className="text-3xl font-semibold">Este enlace ya no sirve</h1>
      <p>
        {mensaje ??
          "El enlace está incompleto, ya se usó o venció (dura 1 hora y sirve una sola vez). Pide uno nuevo."}
      </p>
      <Link href="/admin/recuperar" className={clasesBoton({ tamano: "grande" })}>
        <Send className="size-5" aria-hidden="true" />
        Pedir un nuevo enlace
      </Link>
    </div>
  );
}

/**
 * Elegir la nueva contraseña con el enlace del correo. El token viaja oculto en el
 * formulario y solo se canjea al enviarlo (abrir el enlace no lo gasta). Si todo está
 * bien, el servidor redirige al login.
 */
export function FormularioRestablecer({ tokenHash }: { tokenHash: string }) {
  const [estado, accion, enviando] = useActionState(restablecerContrasenaAccion, ESTADO_INICIAL);
  const [erroresCliente, setErroresCliente] = useState<Partial<
    Record<CampoRestablecimiento, string>
  > | null>(null);

  const refAlerta = useRef<HTMLDivElement>(null);
  const refResultado = useRef<HTMLDivElement>(null);

  const siguiente = estado.estado === "error" ? estado.siguiente : undefined;
  const errores = erroresCliente ?? (estado.estado === "error" ? (estado.errores ?? {}) : {});
  const mensajeGeneral = estado.estado === "error" && !estado.errores ? estado.mensaje : null;

  useEffect(() => {
    if (estado.estado !== "error") return;
    if (estado.siguiente) refResultado.current?.focus();
    else if (estado.errores) enfocarPrimerError(estado.errores);
    else refAlerta.current?.focus();
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    const formData = new FormData(evento.currentTarget);
    const validacion = esquemaRestablecimiento.safeParse({
      nueva: formData.get("nueva") ?? "",
      repetir: formData.get("repetir") ?? "",
    });
    if (!validacion.success) {
      const nuevos = erroresPorCampo<CampoRestablecimiento>(validacion.error);
      setErroresCliente(nuevos);
      enfocarPrimerError(nuevos);
      return;
    }

    setErroresCliente(null);
    startTransition(() => accion(formData));
  }

  // Al corregir un campo, su mensaje de error desaparece.
  function limpiarError(campo: CampoRestablecimiento) {
    if (erroresCliente?.[campo]) {
      const restantes = { ...erroresCliente };
      delete restantes[campo];
      setErroresCliente(restantes);
    }
  }

  if (estado.estado === "error" && siguiente) {
    return (
      <div ref={refResultado} tabIndex={-1} role="alert" className="outline-none">
        {siguiente === "nuevo-enlace" ? (
          <EnlaceNoValido mensaje={estado.mensaje} />
        ) : (
          <div className="flex flex-col items-start gap-4">
            <KeyRound className="size-12 text-salvia-700" aria-hidden="true" />
            <h1 className="text-3xl font-semibold">Tu contraseña no cambió</h1>
            <p>{estado.mensaje}</p>
            <Link href="/admin/login" className={clasesBoton({ tamano: "grande" })}>
              <LogIn className="size-5" aria-hidden="true" />
              Ir a ingresar
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-semibold">Elige tu nueva contraseña</h1>
      <p className="mt-2 text-tinta-suave">
        Al guardarla, cerraremos la sesión en todos tus dispositivos y podrás ingresar con ella.
      </p>
      <form
        onSubmit={alEnviar}
        noValidate
        aria-busy={enviando}
        className="mt-6 flex flex-col gap-5"
      >
        <input type="hidden" name="token_hash" value={tokenHash} />
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
              Guardando…
            </>
          ) : (
            <>
              <KeyRound className="size-5" aria-hidden="true" />
              Guardar contraseña
            </>
          )}
        </Boton>
      </form>
    </>
  );
}
