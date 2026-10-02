import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormularioContrasena } from "@/components/admin/formulario-contrasena";
import { Tarjeta } from "@/components/ui/tarjeta";
import { requerirAdmin } from "@/server/services/auth";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const admin = await requerirAdmin({ permitirContrasenaTemporal: true });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Mi cuenta</h1>
        <p className="mt-1 [overflow-wrap:anywhere] text-tinta-suave">
          Ingresas como <span className="font-semibold text-tinta">{admin.email}</span>.
        </p>
      </header>

      {admin.contrasenaTemporal ? (
        <p
          role="alert"
          className="flex max-w-xl gap-3 rounded-xl border-2 border-terracota bg-white p-4 text-base"
        >
          <KeyRound className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
          <span>
            <span className="font-semibold">Tu contraseña es temporal.</span> Para usar el panel,
            elige una nueva que solo tú conozcas. En «Contraseña actual» escribe la temporal que te
            entregaron.
          </span>
        </p>
      ) : null}

      <section aria-labelledby="titulo-contrasena" className="max-w-xl">
        <Tarjeta>
          <h2 id="titulo-contrasena" className="text-2xl font-semibold">
            Cambiar contraseña
          </h2>
          <p className="mt-2 mb-6 text-tinta-suave">
            Por seguridad te pedimos tu contraseña actual. Al cambiarla, se cierra la sesión en tus
            otros dispositivos.
          </p>
          <FormularioContrasena email={admin.email} />
          <p className="mt-6 border-t border-salvia-100 pt-4 text-base text-tinta-suave">
            ¿No recuerdas tu contraseña actual?{" "}
            <Link
              href="/admin/recuperar"
              className="font-semibold text-salvia-800 underline underline-offset-4"
            >
              Restablécela por correo
            </Link>
            .
          </p>
        </Tarjeta>
      </section>
    </div>
  );
}
