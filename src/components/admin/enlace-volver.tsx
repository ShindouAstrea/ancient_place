import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/** Enlace para volver a la pantalla anterior del panel (ej: de la ficha al listado). */
export function EnlaceVolver({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex min-h-11 items-center gap-1 rounded-full pr-3 text-base font-semibold text-salvia-800 hover:underline print:hidden"
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
      {children}
    </Link>
  );
}
