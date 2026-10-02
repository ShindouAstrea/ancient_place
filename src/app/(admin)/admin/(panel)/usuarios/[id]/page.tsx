import type { Metadata } from "next";
import Link from "next/link";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { AccionesCuenta } from "@/components/admin/usuarios/acciones-cuenta";
import { FormularioCuenta } from "@/components/admin/usuarios/formulario-cuenta";
import { HistorialCuenta } from "@/components/admin/usuarios/historial-cuenta";
import { InsigniasCuenta, textoUltimoIngreso } from "@/components/admin/usuarios/tarjeta-cuenta";
import { Tarjeta } from "@/components/ui/tarjeta";
import { formatearFecha, hoyEnChile } from "@/lib/utils/fechas";
import { obtenerCuenta } from "@/server/services/usuarios";
import { esquemaId } from "@/server/validators/contenido";

export const metadata: Metadata = { title: "Cuenta" };

type Props = { params: Promise<{ id: string }> };

function CuentaNoEncontrada() {
  return (
    <div>
      <EnlaceVolver href="/admin/usuarios">Usuarios</EnlaceVolver>
      <h1 className="text-3xl font-semibold">Cuenta no encontrada</h1>
      <p className="mt-2 text-tinta-suave">Puede que el enlace esté incompleto.</p>
    </div>
  );
}

function Seccion({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`seccion-${id}`} className="space-y-4">
      <h2 id={`seccion-${id}`} className="text-2xl font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Una cuenta: datos y permisos, acceso (contraseña temporal, desactivar) e historial. */
export default async function CuentaPage({ params }: Props) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) return <CuentaNoEncontrada />;

  const { admin, cuenta, historial } = await obtenerCuenta(id);
  if (!cuenta) return <CuentaNoEncontrada />;
  const propia = cuenta.id === admin.id;

  return (
    <div className="space-y-10">
      <div>
        <EnlaceVolver href="/admin/usuarios">Usuarios</EnlaceVolver>
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold [overflow-wrap:anywhere]">
            {cuenta.nombre || cuenta.email}
          </h1>
          <p className="text-lg [overflow-wrap:anywhere] text-tinta-suave">{cuenta.email}</p>
          <p className="text-base text-tinta-suave">
            Cuenta creada el {formatearFecha(hoyEnChile(new Date(cuenta.creadaEn)))} ·{" "}
            {textoUltimoIngreso(cuenta)}
          </p>
          <InsigniasCuenta cuenta={cuenta} propia={propia} />
        </header>
      </div>

      <Seccion id="datos" titulo="Nombre y permisos">
        <p className="text-base text-tinta-suave">
          El correo no se puede cambiar: si está mal, desactiva esta cuenta y crea una nueva.
        </p>
        <FormularioCuenta
          cuenta={{ id: cuenta.id, nombre: cuenta.nombre, roles: cuenta.roles }}
          propia={propia}
        />
      </Seccion>

      <Seccion id="acceso" titulo="Acceso">
        {propia ? (
          <Tarjeta className="text-base">
            Es tu cuenta: no puedes desactivarla ni darte una contraseña temporal. Tu contraseña se
            cambia en{" "}
            <Link
              href="/admin/cuenta"
              className="font-semibold text-salvia-800 underline underline-offset-4"
            >
              Mi cuenta
            </Link>
            .
          </Tarjeta>
        ) : (
          <AccionesCuenta
            id={cuenta.id}
            activa={cuenta.activa}
            nombre={cuenta.nombre || cuenta.email}
            email={cuenta.email}
          />
        )}
      </Seccion>

      <Seccion id="historial" titulo="Historial de cambios">
        <HistorialCuenta eventos={historial} />
      </Seccion>
    </div>
  );
}
