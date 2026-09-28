import { LogIn, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BotonEnviar } from "@/components/ui/boton-enviar";
import { Tarjeta } from "@/components/ui/tarjeta";
import { confirmarAcceso } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Confirmar acceso" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Destino del enlace del correo. NO inicia sesión al abrirse (GET): pide un toque
 * en "Entrar al panel" (POST). Así, los filtros de seguridad de algunos correos
 * que abren los enlaces para revisarlos no gastan el enlace de un solo uso.
 */
export default async function ConfirmarPage({ searchParams }: Props) {
  const { token_hash: tokenHash, type: tipo } = await searchParams;
  if (typeof tokenHash !== "string" || typeof tipo !== "string") {
    redirect("/admin/login?motivo=enlace-invalido");
  }

  return (
    <Tarjeta className="flex flex-col gap-4">
      <ShieldCheck className="size-12 text-salvia-700" aria-hidden="true" />
      <h1 className="text-3xl font-semibold">Confirma tu acceso</h1>
      <p>Presiona el botón para entrar al panel de administración.</p>
      <form action={confirmarAcceso}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={tipo} />
        <BotonEnviar tamano="grande" textoPendiente="Entrando…" className="w-full">
          <LogIn className="size-5" aria-hidden="true" />
          Entrar al panel
        </BotonEnviar>
      </form>
      <p className="text-base text-tinta-suave">
        Este paso evita que los filtros de seguridad de algunos correos usen tu enlace antes que tú.
      </p>
    </Tarjeta>
  );
}
