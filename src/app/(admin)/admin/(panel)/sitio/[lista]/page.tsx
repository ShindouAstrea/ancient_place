import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DEFINICIONES_LISTA } from "@/components/admin/sitio/definiciones";
import { EditorLista, type ElementoEditable } from "@/components/admin/sitio/editor-lista";
import { VolverSitio } from "@/components/admin/sitio/volver-sitio";
import { requerirRol } from "@/server/services/auth";
import { obtenerContenidoSitio } from "@/server/services/contenido";
import { esTipoLista } from "@/server/validators/contenido";
import type { ContenidoSitio, TipoLista } from "@/types/contenido";

type Props = { params: Promise<{ lista: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lista } = await params;
  return { title: esTipoLista(lista) ? DEFINICIONES_LISTA[lista].titulo : "Sitio web" };
}

/** Convierte las filas de la lista en elementos editables (todos los valores como texto). */
function elementosDe(contenido: ContenidoSitio, tipo: TipoLista): ElementoEditable[] {
  const filas: { id: string }[] = contenido[tipo];
  return filas.map(({ id, ...resto }) => ({
    id,
    valores: Object.fromEntries(Object.entries(resto).map(([k, v]) => [k, String(v ?? "")])),
  }));
}

/** Servicios, razones, testimonios o preguntas frecuentes (según la URL). */
export default async function ListaPage({ params }: Props) {
  await requerirRol("sitio");
  const { lista } = await params;
  if (!esTipoLista(lista)) notFound();

  const definicion = DEFINICIONES_LISTA[lista];
  const contenido = await obtenerContenidoSitio();

  return (
    <div>
      <VolverSitio />
      <h1 className="text-3xl font-semibold">{definicion.titulo}</h1>
      <p className="mt-1 text-tinta-suave">{definicion.descripcion}</p>
      {definicion.aviso ? (
        <p className="mt-4 flex gap-3 rounded-xl border-2 border-terracota bg-white p-4 text-base">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-terracota" aria-hidden="true" />
          {definicion.aviso}
        </p>
      ) : null}

      <div className="mt-6">
        <EditorLista
          tipo={lista}
          campos={definicion.campos}
          elementos={elementosDe(contenido, lista)}
          singular={definicion.singular}
          textoAgregar={definicion.textoAgregar}
          campoTitulo={definicion.campoTitulo}
          campoDetalle={definicion.campoDetalle}
        />
      </div>
    </div>
  );
}
