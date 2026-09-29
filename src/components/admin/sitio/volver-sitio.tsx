import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/** Enlace para volver al índice del módulo Sitio web. */
export function VolverSitio() {
  return (
    <Link
      href="/admin/sitio"
      className="mb-4 inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-base font-semibold text-salvia-800 hover:underline"
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
      Sitio web
    </Link>
  );
}
