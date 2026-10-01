import type { Metadata } from "next";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { FormularioPaciente } from "@/components/admin/pacientes/formulario-paciente";
import { requerirEditarFichas } from "@/server/services/pacientes";

export const metadata: Metadata = { title: "Nuevo paciente" };

export default async function NuevoPacientePage() {
  await requerirEditarFichas({ volverA: "/admin/pacientes/nuevo" });

  return (
    <div>
      <EnlaceVolver href="/admin/pacientes">Pacientes</EnlaceVolver>
      <h1 className="text-3xl font-semibold">Nuevo paciente</h1>
      <p className="mt-1 mb-6 text-tinta-suave">
        Solo el nombre es obligatorio; el resto puedes completarlo después. Los medicamentos se
        agregan desde la ficha.
      </p>
      <FormularioPaciente paciente={null} />
    </div>
  );
}
