import type { NextRequest } from "next/server";

import { actualizarSesion } from "@/lib/supabase/middleware";

/** Rutas bajo /admin accesibles sin sesión (ingreso y recuperación de contraseña). */
const RUTAS_PUBLICAS = ["/admin/login", "/admin/recuperar", "/admin/restablecer"];

/**
 * Proxy de Next.js 16 (antes "middleware"). Solo corre en /admin (ver matcher):
 * las páginas públicas no pagan este costo.
 *
 * 1. Renueva la sesión de Supabase en cada petición del panel.
 * 2. Verificación OPTIMISTA: sin sesión, redirige al login.
 *
 * La verificación definitiva (¿es administrador?) NO se hace aquí sino en la capa
 * de datos (server/services/auth.ts), en cada página y Server Action, como
 * recomienda Next.js; además, RLS la vuelve a exigir en la base de datos.
 */
export async function proxy(request: NextRequest) {
  const { respuesta, claims, redirigir } = await actualizarSesion(request);

  const ruta = request.nextUrl.pathname;
  const esPublica = RUTAS_PUBLICAS.some((r) => ruta === r || ruta.startsWith(`${r}/`));

  if (!claims && !esPublica) {
    const login = new URL("/admin/login", request.url);
    // Tras ingresar, vuelve a donde iba (ej: la ficha que abrió un QR). El login
    // valida esta ruta antes de usarla.
    if (ruta !== "/admin") login.searchParams.set("siguiente", ruta);
    return redirigir(login);
  }
  return respuesta;
}

export const config = {
  // `:path*` también coincide con /admin (cero o más segmentos).
  matcher: ["/admin/:path*"],
};
