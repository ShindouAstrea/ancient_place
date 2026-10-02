import { UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TarjetaCuenta } from "@/components/admin/usuarios/tarjeta-cuenta";
import { clasesBoton } from "@/components/ui/boton";
import { obtenerCuentas, type Cuenta } from "@/server/services/usuarios";

export const metadata: Metadata = { title: "Usuarios" };

function Lista({ cuentas, propiaId }: { cuentas: Cuenta[]; propiaId: string }) {
  return (
    <ul className="grid gap-3">
      {cuentas.map((cuenta) => (
        <li key={cuenta.id}>
          <TarjetaCuenta cuenta={cuenta} propia={cuenta.id === propiaId} />
        </li>
      ))}
    </ul>
  );
}

/** Cuentas del panel: activas primero, luego las desactivadas. */
export default async function UsuariosPage() {
  const { admin, cuentas } = await obtenerCuentas();
  const activas = cuentas.filter((c) => c.activa);
  const desactivadas = cuentas.filter((c) => !c.activa);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Usuarios</h1>
          <p className="mt-1 max-w-2xl text-tinta-suave">
            Cuentas con acceso al panel. Cada persona debe tener la suya, nunca compartida: así el
            historial de las fichas indica quién hizo cada cosa.
          </p>
        </div>
        <Link href="/admin/usuarios/nueva" className={clasesBoton()}>
          <UserPlus className="size-5" aria-hidden="true" />
          Nueva cuenta
        </Link>
      </header>

      <section aria-labelledby="titulo-activas" className="space-y-3">
        <h2 id="titulo-activas" className="text-2xl font-semibold">
          Activas ({activas.length})
        </h2>
        <Lista cuentas={activas} propiaId={admin.id} />
      </section>

      {desactivadas.length > 0 ? (
        <section aria-labelledby="titulo-desactivadas" className="space-y-3">
          <h2 id="titulo-desactivadas" className="text-2xl font-semibold">
            Desactivadas ({desactivadas.length})
          </h2>
          <p className="text-base text-tinta-suave">
            No pueden ingresar. Se conservan para que el historial siga indicando quién hizo cada
            cosa.
          </p>
          <Lista cuentas={desactivadas} propiaId={admin.id} />
        </section>
      ) : null}
    </div>
  );
}
