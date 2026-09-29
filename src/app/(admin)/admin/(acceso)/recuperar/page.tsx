import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FormularioRecuperacion } from "@/components/admin/formulario-recuperacion";
import { Tarjeta } from "@/components/ui/tarjeta";

export const metadata: Metadata = { title: "Recuperar contraseña" };

// Página estática que muestra el nombre del hogar (layout): se regenera como la landing.
export const revalidate = 3600;

/** "¿Olvidaste tu contraseña?". Pública: también sirve con sesión (desde Mi cuenta). */
export default function RecuperarPage() {
  return (
    <>
      <Link
        href="/admin/login"
        className="mb-4 inline-flex min-h-11 items-center gap-1 self-start rounded-full pr-3 text-base font-semibold text-salvia-800 hover:underline"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
        Volver a ingresar
      </Link>
      <Tarjeta>
        <FormularioRecuperacion />
      </Tarjeta>
    </>
  );
}
