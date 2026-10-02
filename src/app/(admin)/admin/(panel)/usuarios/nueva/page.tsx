import type { Metadata } from "next";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { FormularioCuenta } from "@/components/admin/usuarios/formulario-cuenta";
import { requerirGestionUsuarios } from "@/server/services/usuarios";

export const metadata: Metadata = { title: "Nueva cuenta" };

export default async function NuevaCuentaPage() {
  await requerirGestionUsuarios({ volverA: "/admin/usuarios/nueva" });

  return (
    <div>
      <EnlaceVolver href="/admin/usuarios">Usuarios</EnlaceVolver>
      <h1 className="text-3xl font-semibold">Nueva cuenta</h1>
      <p className="mt-1 mb-6 max-w-2xl text-tinta-suave">
        Al crearla verás una contraseña temporal para entregarle a la persona. Con ella ingresa por
        primera vez, y el panel le pedirá elegir una propia.
      </p>
      <FormularioCuenta cuenta={null} />
    </div>
  );
}
