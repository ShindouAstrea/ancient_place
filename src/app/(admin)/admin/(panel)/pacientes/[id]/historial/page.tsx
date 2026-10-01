import type { Metadata } from "next";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { FichaNoEncontrada } from "@/components/admin/pacientes/ficha-no-encontrada";
import { HistorialFicha } from "@/components/admin/pacientes/historial-ficha";
import { EVENTOS_HISTORIAL, obtenerHistorial } from "@/server/services/pacientes";
import { esquemaId } from "@/server/validators/contenido";

export const metadata: Metadata = { title: "Historial de la ficha" };

type Props = { params: Promise<{ id: string }> };

/** Quién consultó o cambió la ficha y cuándo (solo rol «pacientes»). */
export default async function HistorialPage({ params }: Props) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) return <FichaNoEncontrada />;
  const { ficha, eventos } = await obtenerHistorial(id);
  if (!ficha) return <FichaNoEncontrada />;

  return (
    <div>
      <EnlaceVolver href={`/admin/pacientes/${id}`}>Ficha</EnlaceVolver>
      <h1 className="text-3xl font-semibold [overflow-wrap:anywhere]">
        Historial de {ficha.nombres} {ficha.apellidos}
      </h1>
      <p className="mt-1 mb-6 text-tinta-suave">
        Quién consultó o modificó la ficha, y qué cambió. Lo registra la base de datos y nadie puede
        alterarlo. Se muestran los últimos {EVENTOS_HISTORIAL} movimientos.
      </p>
      <HistorialFicha eventos={eventos} />
    </div>
  );
}
