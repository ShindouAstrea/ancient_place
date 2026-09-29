import { Leaf } from "lucide-react";

import { obtenerContenidoSitio } from "@/server/services/contenido";

/** Páginas de acceso (sin sesión): tarjeta centrada, cómoda en el celular. */
export default async function AccesoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { config } = await obtenerContenidoSitio();

  return (
    <main
      id="contenido"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10"
    >
      <p className="mb-6 flex items-center gap-2 font-serif text-xl font-semibold text-salvia-800">
        <Leaf className="size-7 shrink-0" aria-hidden="true" />
        {config.nombre}
      </p>
      {children}
    </main>
  );
}
