"use client";

import { CircleAlert, LogOut, Undo2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/boton";
import { cambiarEgresoAccion } from "@/server/actions/pacientes";

/**
 * Egresar (o reingresar) a un residente, con confirmación en la misma pantalla.
 * La ficha nunca se borra: deja de aparecer entre los activos y conserva su historial.
 */
export function BotonEgreso({ pacienteId, egresado }: { pacienteId: string; egresado: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  function ejecutar() {
    setError(null);
    iniciar(async () => {
      const resultado = await cambiarEgresoAccion(pacienteId, !egresado);
      if (resultado.estado === "error") setError(resultado.mensaje);
      setConfirmando(false);
    });
  }

  if (egresado) {
    return (
      <div className="space-y-2">
        <Boton variante="secundario" onClick={ejecutar} disabled={ocupado}>
          <Undo2 className="size-5" aria-hidden="true" />
          {ocupado ? "Reingresando…" : "Reingresar"}
        </Boton>
        {error ? (
          <p role="alert" className="font-semibold text-terracota">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {confirmando ? (
        <div role="alert" className="rounded-xl bg-terracota-claro p-4">
          <p className="font-semibold">¿Egresar a este residente?</p>
          <p className="mt-1 text-base">
            Deja de aparecer entre los residentes activos. La ficha y su historial se conservan, y
            puedes reingresarlo después.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Boton
              onClick={ejecutar}
              disabled={ocupado}
              className="bg-terracota hover:bg-terracota/90"
            >
              <LogOut className="size-5" aria-hidden="true" />
              {ocupado ? "Egresando…" : "Sí, egresar"}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmando(false)} disabled={ocupado}>
              No, cancelar
            </Boton>
          </div>
        </div>
      ) : (
        <Boton variante="secundario" onClick={() => setConfirmando(true)}>
          <LogOut className="size-5" aria-hidden="true" />
          Egresar
        </Boton>
      )}
      {error ? (
        <p role="alert" className="flex gap-2 font-semibold text-terracota">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
