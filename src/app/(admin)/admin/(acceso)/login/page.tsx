import { CircleAlert, Info } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioAcceso } from "@/components/admin/formulario-acceso";
import { BotonEnviar } from "@/components/ui/boton-enviar";
import { Tarjeta } from "@/components/ui/tarjeta";
import { salir } from "@/server/actions/auth";
import { obtenerSesion } from "@/server/services/auth";
import { MOTIVOS_LOGIN, type MotivoLogin } from "@/server/validators/auth";

export const metadata: Metadata = { title: "Ingresar" };

const AVISOS: Record<MotivoLogin, { tono: "info" | "error"; texto: string }> = {
  "sin-acceso": { tono: "error", texto: "Esta cuenta no tiene acceso al panel de administración." },
  "sesion-cerrada": { tono: "info", texto: "Cerraste sesión correctamente." },
  "sesion-requerida": { tono: "info", texto: "Tu sesión terminó. Ingresa nuevamente." },
};

function esMotivo(valor: unknown): valor is MotivoLogin {
  return typeof valor === "string" && (MOTIVOS_LOGIN as readonly string[]).includes(valor);
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: Props) {
  const sesion = await obtenerSesion();
  if (sesion.activa && sesion.admin) redirect("/admin");

  const { motivo } = await searchParams;
  const aviso = esMotivo(motivo) ? AVISOS[motivo] : null;

  return (
    <Tarjeta>
      <h1 className="text-3xl font-semibold">Ingresar al panel</h1>

      {aviso ? (
        <p
          role={aviso.tono === "error" ? "alert" : "status"}
          className="mt-4 flex gap-3 rounded-xl bg-salvia-50 p-4 text-base"
        >
          {aviso.tono === "error" ? (
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
          ) : (
            <Info className="mt-0.5 size-5 shrink-0 text-salvia-700" aria-hidden="true" />
          )}
          {aviso.texto}
        </p>
      ) : null}

      {sesion.activa ? (
        // Sesión de una cuenta sin rol de administrador: solo se ofrece cerrarla.
        <div className="mt-6 flex flex-col gap-4">
          <p>
            Tu sesión actual no tiene acceso al panel. Cierra sesión para ingresar con otra cuenta.
          </p>
          <form action={salir}>
            <BotonEnviar variante="secundario" textoPendiente="Cerrando sesión…" className="w-full">
              Cerrar sesión
            </BotonEnviar>
          </form>
        </div>
      ) : (
        <>
          <p className="mt-2 text-tinta-suave">Ingresa con tu correo y contraseña.</p>
          <div className="mt-6">
            <FormularioAcceso />
          </div>
        </>
      )}
    </Tarjeta>
  );
}
