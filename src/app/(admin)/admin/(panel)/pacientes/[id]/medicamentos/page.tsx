import type { Metadata } from "next";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { EditorMedicamentos } from "@/components/admin/pacientes/editor-medicamentos";
import { FichaNoEncontrada } from "@/components/admin/pacientes/ficha-no-encontrada";
import { obtenerFichaParaEditar } from "@/server/services/pacientes";
import { esquemaId } from "@/server/validators/contenido";

export const metadata: Metadata = { title: "Medicamentos" };

type Props = { params: Promise<{ id: string }> };

export default async function MedicamentosPage({ params }: Props) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) return <FichaNoEncontrada />;
  const ficha = await obtenerFichaParaEditar(id);
  if (!ficha) return <FichaNoEncontrada />;

  return (
    <div>
      <EnlaceVolver href={`/admin/pacientes/${id}`}>Ficha</EnlaceVolver>
      <h1 className="text-3xl font-semibold [overflow-wrap:anywhere]">
        Medicamentos de {ficha.nombres} {ficha.apellidos}
      </h1>
      <p className="mt-1 mb-6 text-tinta-suave">
        Programados: con sus horas y días. Situacionales: se dan solo ante la situación que
        indiques. Cada cambio queda en el historial de la ficha.
      </p>
      <EditorMedicamentos pacienteId={id} medicamentos={ficha.medicamentos} />
    </div>
  );
}
