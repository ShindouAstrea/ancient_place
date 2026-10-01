import { QrCode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { clasesBoton } from "@/components/ui/boton";
import { Tarjeta } from "@/components/ui/tarjeta";
import { resolverCodigoQr } from "@/server/services/pacientes";
import { esquemaCodigoQr } from "@/server/validators/pacientes";

export const metadata: Metadata = { title: "Ficha de paciente" };

type Props = { params: Promise<{ codigo: string }> };

/**
 * Destino del QR de una ficha: /admin/p/<código aleatorio>.
 * - Sin sesión, el proxy pide ingresar y vuelve aquí.
 * - Con permiso para ver fichas, abre la ficha que corresponde.
 * - Sin permiso, lleva al inicio del panel con un aviso.
 */
export default async function CodigoQrPage({ params }: Props) {
  const { codigo } = await params;
  const id = esquemaCodigoQr.safeParse(codigo).success ? await resolverCodigoQr(codigo) : null;
  if (id) redirect(`/admin/pacientes/${id}`);

  return (
    <Tarjeta className="flex flex-col items-start gap-4">
      <QrCode className="size-12 text-salvia-700" aria-hidden="true" />
      <h1 className="text-3xl font-semibold">Este código QR no es válido</h1>
      <p>
        Puede que la etiqueta se haya reemplazado por una nueva. Busca al residente en el listado de
        pacientes.
      </p>
      <Link href="/admin/pacientes" className={clasesBoton()}>
        Ir a pacientes
      </Link>
    </Tarjeta>
  );
}
