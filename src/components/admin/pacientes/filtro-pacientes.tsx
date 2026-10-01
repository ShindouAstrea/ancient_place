"use client";

import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";

import { claseControl } from "@/components/ui/campo";
import { cn } from "@/lib/utils/cn";

/** "José Pérez" → "jose perez": la búsqueda ignora mayúsculas y tildes. */
const normalizar = (texto: string) =>
  // NFD separa "é" en "e" + tilde; \p{M} quita las tildes (marcas diacríticas).
  texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

type Elemento = { id: string; textoBusqueda: string; contenido: ReactNode };

/** Lista de pacientes con buscador por nombre o habitación (filtra en el navegador). */
export function FiltroPacientes({ elementos }: { elementos: Elemento[] }) {
  const [busqueda, setBusqueda] = useState("");
  const termino = normalizar(busqueda.trim());
  const visibles = termino
    ? elementos.filter((e) => normalizar(e.textoBusqueda).includes(termino))
    : elementos;

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="buscar-paciente" className="sr-only">
          Buscar por nombre o habitación
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-tinta-suave"
          aria-hidden="true"
        />
        <input
          id="buscar-paciente"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Nombre o habitación"
          autoComplete="off"
          className={cn(claseControl, "pl-12")}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {termino ? `${visibles.length} resultados` : ""}
      </p>

      {visibles.length > 0 ? (
        <ul className="space-y-3">
          {visibles.map((e) => (
            <li key={e.id}>{e.contenido}</li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-salvia-300 bg-white p-6 text-center text-tinta-suave">
          Ningún paciente coincide con «{busqueda}».
        </p>
      )}
    </div>
  );
}
