"use client";

import { CircleAlert, CircleCheck, KeyRound, UserCheck, UserX } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import { Boton } from "@/components/ui/boton";
import { cambiarEstadoCuentaAccion, contrasenaTemporalAccion } from "@/server/actions/usuarios";
import type { EstadoCuenta } from "@/server/validators/usuarios";

import { ContrasenaTemporal } from "./contrasena-temporal";

type Props = { id: string; activa: boolean; nombre: string; email: string };

/** Confirmación en la misma pantalla para las acciones que cortan el acceso. */
function Confirmacion({
  pregunta,
  children,
  textoConfirmar,
  ocupado,
  onConfirmar,
  onCancelar,
}: {
  pregunta: string;
  children: ReactNode;
  textoConfirmar: string;
  ocupado: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl bg-terracota-claro p-4">
      <p className="font-semibold">{pregunta}</p>
      <p className="mt-1 text-base">{children}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Boton
          onClick={onConfirmar}
          disabled={ocupado}
          className="bg-terracota hover:bg-terracota/90"
        >
          {ocupado ? "Un momento…" : textoConfirmar}
        </Boton>
        <Boton variante="secundario" onClick={onCancelar} disabled={ocupado}>
          No, cancelar
        </Boton>
      </div>
    </div>
  );
}

/**
 * Acceso de otra cuenta: contraseña temporal, desactivar y reactivar. La propia cuenta no
 * las tiene (la base de datos tampoco lo permite).
 */
export function AccionesCuenta({ id, activa, nombre, email }: Props) {
  const [confirmando, setConfirmando] = useState<"contrasena" | "desactivar" | null>(null);
  const [resultado, setResultado] = useState<EstadoCuenta>({ estado: "inicial" });
  const [contrasena, setContrasena] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  function ejecutar(accion: () => Promise<EstadoCuenta>) {
    setResultado({ estado: "inicial" });
    iniciar(async () => {
      const respuesta = await accion();
      setResultado(respuesta);
      // Tras desactivar o generar otra, la contraseña que estaba a la vista ya no sirve.
      if (respuesta.estado === "exito") setContrasena(respuesta.contrasena ?? null);
      setConfirmando(null);
    });
  }

  return (
    <div className="space-y-4">
      {contrasena ? (
        <ContrasenaTemporal contrasena={contrasena} email={email} nombre={nombre} nivel={3} />
      ) : null}

      {resultado.estado === "error" ? (
        <p role="alert" className="flex gap-2 font-semibold text-terracota">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {resultado.mensaje}
        </p>
      ) : null}
      {resultado.estado === "exito" && !resultado.contrasena ? (
        <p
          role="status"
          className="flex gap-2 rounded-xl bg-salvia-100 p-4 font-semibold text-salvia-900"
        >
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {resultado.mensaje}
        </p>
      ) : null}

      {!activa ? (
        <div className="space-y-2">
          <p className="text-base text-tinta-suave">
            Al reactivarla recupera los mismos permisos. Si no recuerda su contraseña, dale una
            temporal después.
          </p>
          <Boton
            onClick={() => ejecutar(() => cambiarEstadoCuentaAccion(id, true))}
            disabled={ocupado}
          >
            <UserCheck className="size-5" aria-hidden="true" />
            {ocupado ? "Reactivando…" : "Reactivar cuenta"}
          </Boton>
        </div>
      ) : confirmando === "contrasena" ? (
        <Confirmacion
          pregunta="¿Darle una contraseña temporal?"
          textoConfirmar="Sí, generar contraseña"
          ocupado={ocupado}
          onConfirmar={() => ejecutar(() => contrasenaTemporalAccion(id))}
          onCancelar={() => setConfirmando(null)}
        >
          Su contraseña actual deja de funcionar y se cierra su sesión en todos sus dispositivos.
          Verás la nueva una sola vez; al ingresar, deberá elegir una propia.
        </Confirmacion>
      ) : confirmando === "desactivar" ? (
        <Confirmacion
          pregunta="¿Desactivar esta cuenta?"
          textoConfirmar="Sí, desactivar"
          ocupado={ocupado}
          onConfirmar={() => ejecutar(() => cambiarEstadoCuentaAccion(id, false))}
          onCancelar={() => setConfirmando(null)}
        >
          No podrá ingresar al panel y se cerrará su sesión en todos sus dispositivos. Todo lo que
          registró se conserva, y puedes reactivarla cuando quieras.
        </Confirmacion>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Boton variante="secundario" onClick={() => setConfirmando("contrasena")}>
            <KeyRound className="size-5" aria-hidden="true" />
            Dar contraseña temporal
          </Boton>
          <Boton variante="secundario" onClick={() => setConfirmando("desactivar")}>
            <UserX className="size-5" aria-hidden="true" />
            Desactivar cuenta
          </Boton>
        </div>
      )}
    </div>
  );
}
