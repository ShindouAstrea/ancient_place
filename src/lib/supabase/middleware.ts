import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { envPublico, envServidor } from "@/lib/env";
import type { Database } from "@/types/database";

import { nombreCookieAuth } from "./config";

/**
 * Renueva la sesión de Supabase Auth en el proxy de Next.js (antes "middleware").
 *
 * Los Server Components no pueden escribir cookies, así que el token vencido se
 * renueva aquí y se reenvía tanto a la petición (para el render actual) como a la
 * respuesta (para el navegador). Se usa en src/proxy.ts (etapa 5).
 *
 * Devuelve la respuesta a retornar y los claims del usuario (null si no hay sesión).
 */
export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request });
  const url = envServidor().SUPABASE_INTERNAL_URL ?? envPublico.NEXT_PUBLIC_SUPABASE_URL;

  const supabase = createServerClient<Database>(
    url,
    envPublico.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookieOptions: { name: nombreCookieAuth },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesAGuardar, cabeceras) {
          cookiesAGuardar.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesAGuardar.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options),
          );
          // Cabeceras anti-caché: evitan que un CDN guarde una respuesta con la
          // cookie de sesión de un usuario y se la entregue a otro.
          Object.entries(cabeceras).forEach(([clave, valor]) =>
            respuesta.headers.set(clave, valor),
          );
        },
      },
    },
  );

  // IMPORTANTE: no ejecutar código entre createServerClient y getClaims().
  // getClaims() valida la firma del JWT (no confía ciegamente en la cookie como
  // getSession()) y dispara la renovación del token si está por vencer.
  const { data } = await supabase.auth.getClaims();

  return { respuesta, claims: data?.claims ?? null };
}
