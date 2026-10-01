import type { Metadata } from "next";

import { EnlaceVolver } from "@/components/admin/enlace-volver";
import { CodigoQr } from "@/components/admin/pacientes/codigo-qr";
import { ControlesQr } from "@/components/admin/pacientes/controles-qr";
import { FichaNoEncontrada } from "@/components/admin/pacientes/ficha-no-encontrada";
import { envPublico } from "@/lib/env";
import { obtenerFichaParaEditar } from "@/server/services/pacientes";
import { esquemaId } from "@/server/validators/contenido";

export const metadata: Metadata = { title: "Código QR" };

type Props = { params: Promise<{ id: string }> };

/**
 * Etiqueta con el QR de la ficha, lista para imprimir. El QR solo lleva un código
 * aleatorio: al escanearlo se pide ingresar con una cuenta autorizada.
 */
export default async function QrPacientePage({ params }: Props) {
  const { id } = await params;
  if (!esquemaId.safeParse(id).success) return <FichaNoEncontrada />;
  const ficha = await obtenerFichaParaEditar(id);
  if (!ficha) return <FichaNoEncontrada />;

  const nombre = `${ficha.nombres} ${ficha.apellidos}`;
  const url = `${envPublico.NEXT_PUBLIC_SITE_URL}/admin/p/${ficha.codigo_qr}`;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <EnlaceVolver href={`/admin/pacientes/${id}`}>Ficha</EnlaceVolver>
        <h1 className="text-3xl font-semibold">Código QR de la ficha</h1>
        <p className="mt-2 max-w-2xl text-tinta-suave">
          Imprime la etiqueta y pégala donde el equipo la necesite (por ejemplo, en la carpeta o la
          puerta de la habitación). El QR no contiene datos del paciente: al escanearlo se pide
          ingresar con una cuenta autorizada y luego se abre la ficha.
        </p>
      </div>

      <div className="mx-auto w-fit rounded-2xl border-2 border-dashed border-salvia-300 bg-white p-6 text-center print:mx-0 print:border-solid print:border-black">
        <CodigoQr texto={url} tamano={240} etiqueta={`Código QR de la ficha de ${nombre}`} />
        <p className="mx-auto mt-3 max-w-60 text-xl font-semibold [overflow-wrap:anywhere]">
          {nombre}
        </p>
        {ficha.habitacion ? <p>Habitación {ficha.habitacion}</p> : null}
        <p className="mt-1 text-base text-tinta-suave">Ficha del residente · requiere ingresar</p>
      </div>

      <ControlesQr pacienteId={id} />
    </div>
  );
}
