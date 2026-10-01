import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { clasesBoton } from "@/components/ui/boton";
import { Tarjeta } from "@/components/ui/tarjeta";

/** La ficha no existe (enlace mal copiado) o la cuenta no puede verla. */
export function FichaNoEncontrada() {
  return (
    <Tarjeta className="flex flex-col items-start gap-4">
      <FileQuestion className="size-12 text-salvia-700" aria-hidden="true" />
      <h1 className="text-3xl font-semibold">No encontramos esta ficha</h1>
      <p>Puede que el enlace esté incompleto. Búscala en el listado de pacientes.</p>
      <Link href="/admin/pacientes" className={clasesBoton()}>
        Ir a pacientes
      </Link>
    </Tarjeta>
  );
}
