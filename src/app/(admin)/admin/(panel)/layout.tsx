import { Leaf, LogOut } from "lucide-react";
import Link from "next/link";

import { NavegacionInferior, NavegacionSuperior } from "@/components/admin/navegacion-admin";
import { navegacionPara } from "@/config/admin";
import { BotonEnviar } from "@/components/ui/boton-enviar";
import { salir } from "@/server/actions/auth";
import { requerirAdmin } from "@/server/services/auth";

/**
 * Estructura del panel. requerirAdmin() aquí sirve para mostrar el correo en la
 * cabecera; la protección real la hace cada página y Server Action (los layouts
 * no se vuelven a ejecutar al navegar).
 */
export default async function PanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requerirAdmin();
  const navegacion = navegacionPara(admin.roles);

  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-50 rounded-full bg-salvia-800 px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-30 border-b border-salvia-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/admin"
            className="flex min-h-11 items-center gap-2 font-serif text-lg font-semibold text-salvia-800"
          >
            <Leaf className="size-6 shrink-0" aria-hidden="true" />
            Panel
          </Link>

          <NavegacionSuperior items={navegacion} />

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-base text-tinta-suave xl:block">
              {admin.email}
            </span>
            <form action={salir}>
              <BotonEnviar variante="secundario" textoPendiente="Saliendo…">
                <LogOut className="size-5" aria-hidden="true" />
                Salir
              </BotonEnviar>
            </form>
          </div>
        </div>
      </header>

      {/* pb-28 en móvil: espacio para la barra de navegación inferior fija. */}
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 outline-none sm:px-6 lg:pb-12 print:p-0"
      >
        {children}
      </main>

      <NavegacionInferior items={navegacion} />
    </>
  );
}
