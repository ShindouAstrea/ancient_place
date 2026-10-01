"use client";

import { CircleAlert, CircleCheck, Printer, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";

import { Boton } from "@/components/ui/boton";
import { regenerarQrAccion } from "@/server/actions/pacientes";
import type { EstadoEdicion } from "@/server/validators/contenido";

/** Imprimir la etiqueta y generar un QR nuevo (invalida el anterior), con confirmación. */
export function ControlesQr({ pacienteId }: { pacienteId: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<EstadoEdicion | null>(null);
  const [ocupado, iniciar] = useTransition();

  function regenerar() {
    iniciar(async () => {
      setResultado(await regenerarQrAccion(pacienteId));
      setConfirmando(false);
    });
  }

  return (
    <div className="space-y-4 print:hidden">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Boton tamano="grande" onClick={() => window.print()}>
          <Printer className="size-5" aria-hidden="true" />
          Imprimir etiqueta
        </Boton>
        {confirmando ? null : (
          <Boton
            variante="secundario"
            tamano="grande"
            onClick={() => {
              setResultado(null);
              setConfirmando(true);
            }}
          >
            <RefreshCw className="size-5" aria-hidden="true" />
            Generar nuevo QR
          </Boton>
        )}
      </div>

      {confirmando ? (
        <div role="alert" className="rounded-xl bg-terracota-claro p-4">
          <p className="font-semibold">¿Generar un QR nuevo?</p>
          <p className="mt-1 text-base">
            La etiqueta actual dejará de funcionar. Úsalo si una etiqueta se perdió o quedó en manos
            equivocadas; después imprime y pega la nueva.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Boton
              onClick={regenerar}
              disabled={ocupado}
              className="bg-terracota hover:bg-terracota/90"
            >
              <RefreshCw className="size-5" aria-hidden="true" />
              {ocupado ? "Generando…" : "Sí, generar uno nuevo"}
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmando(false)} disabled={ocupado}>
              No, conservar el actual
            </Boton>
          </div>
        </div>
      ) : null}

      {resultado && resultado.estado !== "inicial" ? (
        <p
          role={resultado.estado === "error" ? "alert" : "status"}
          className="flex gap-2 font-semibold"
        >
          {resultado.estado === "exito" ? (
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-salvia-700" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
          )}
          {resultado.mensaje}
        </p>
      ) : null}
    </div>
  );
}
