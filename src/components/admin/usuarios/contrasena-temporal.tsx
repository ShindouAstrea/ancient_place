"use client";

import { Check, Copy, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Boton } from "@/components/ui/boton";
import { envPublico } from "@/lib/env";

/**
 * Contraseña temporal recién generada. Se muestra UNA sola vez: no se guarda en ningún
 * lado, y quien la pierda debe generar otra.
 */
export function ContrasenaTemporal({
  contrasena,
  email,
  nombre,
  nivel = 2,
}: {
  contrasena: string;
  email: string;
  nombre: string;
  /** Nivel del título según dónde se muestre (h2 o h3). */
  nivel?: 2 | 3;
}) {
  const [copiada, setCopiada] = useState(false);
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const Titulo = nivel === 3 ? "h3" : "h2";

  // Al aparecer, el foco va al aviso (lectores de pantalla y teclado lo encuentran de inmediato).
  useEffect(() => refTitulo.current?.focus(), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(contrasena);
      setCopiada(true);
    } catch {
      // Sin acceso al portapapeles: el texto se puede seleccionar a mano.
      setCopiada(false);
    }
  }

  return (
    <section
      aria-labelledby="contrasena-temporal-titulo"
      className="space-y-4 rounded-2xl border-2 border-salvia-700 bg-salvia-50 p-5 sm:p-6"
    >
      <Titulo
        id="contrasena-temporal-titulo"
        ref={refTitulo}
        tabIndex={-1}
        className="flex items-center gap-2 text-xl font-semibold outline-none"
      >
        <KeyRound className="size-6 shrink-0 text-salvia-800" aria-hidden="true" />
        Contraseña temporal de {nombre}
      </Titulo>

      <div className="flex flex-wrap items-center gap-3">
        <p className="rounded-xl border border-salvia-300 bg-white px-4 py-3 font-mono text-2xl tracking-wide break-all select-all">
          {contrasena}
        </p>
        <Boton variante="secundario" onClick={copiar}>
          {copiada ? (
            <Check className="size-5" aria-hidden="true" />
          ) : (
            <Copy className="size-5" aria-hidden="true" />
          )}
          {copiada ? "Copiada" : "Copiar"}
        </Boton>
      </div>
      <p role="status" className="sr-only">
        {copiada ? "Contraseña copiada al portapapeles." : ""}
      </p>

      <ul className="list-disc space-y-1 pl-6 text-base">
        <li>
          <span className="font-semibold">Solo se muestra esta vez.</span> Entrégasela en persona o
          por un mensaje privado. Si se pierde, genera otra desde su cuenta.
        </li>
        <li className="[overflow-wrap:anywhere]">
          Ingresa en <span className="font-semibold">{envPublico.NEXT_PUBLIC_SITE_URL}/admin</span>{" "}
          con su correo <span className="font-semibold">{email}</span> y esta contraseña.
        </li>
        <li>
          Al ingresar, el panel le pedirá elegir una contraseña propia. Hasta entonces no puede ver
          nada más.
        </li>
      </ul>
    </section>
  );
}
