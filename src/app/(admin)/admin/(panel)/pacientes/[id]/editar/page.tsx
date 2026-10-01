import type { Metadata } from "next";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { FichaNoEncontrada } from "@/components/admin/pacientes/ficha-no-encontrada";
import { FormularioPaciente } from "@/components/admin/pacientes/formulario-paciente";
import { obtenerFichaParaEditar } from "@/server/services/pacientes";
import { esquemaId } from "@/server/validators/contenido";

export const metadata: Metadata = { title: "Editar ficha" };

type Props = { params: Promise<{ id: string }> };

export default async function EditarPacientePage({ params }: Props) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) return <FichaNoEncontrada />;
  const ficha = await obtenerFichaParaEditar(id);
  if (!ficha) return <FichaNoEncontrada />;

  return (
    <div>
      <EnlaceVolver href={`/admin/pacientes/${id}`}>Ficha</EnlaceVolver>
      <h1 className="text-3xl font-semibold [overflow-wrap:anywhere]">
        Editar: {ficha.nombres} {ficha.apellidos}
      </h1>
      <p className="mt-1 mb-6 text-tinta-suave">
        Cada cambio queda registrado en el historial de la ficha.
      </p>
      <FormularioPaciente paciente={ficha} />
    </div>
  );
}
