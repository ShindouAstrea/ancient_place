import { z } from "zod";

/**
 * Variables de entorno validadas con Zod.
 *
 * Hay DOS grupos, y es importante no mezclarlos:
 *
 * 1. PÚBLICAS DE BUILD (`NEXT_PUBLIC_*`): Next.js las incrusta en el JavaScript
 *    en tiempo de `next build`. Cambiarlas exige volver a construir (en Docker se
 *    pasan como `--build-arg`). Son visibles para cualquier visitante: nunca
 *    deben contener secretos.
 *
 * 2. DE SERVIDOR / RUNTIME: se leen al ejecutar el servidor (en Docker con `-e` o
 *    `--env-file`; en Vercel en "Environment Variables"). Nunca llegan al navegador.
 *
 * NOTA: `SUPABASE_SERVICE_ROLE_KEY` NO se usa en este proyecto a propósito. La
 * seguridad de los datos se garantiza con políticas RLS. Si algún día se
 * necesitara, debe leerse solo aquí, en el esquema de servidor, y jamás con
 * prefijo `NEXT_PUBLIC_`.
 */

const esquemaPublico = z.object({
  /** URL pública del sitio, ej: https://dominio.cl (sin "/" final). */
  NEXT_PUBLIC_SITE_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
  /** URL del proyecto Supabase (local: http://127.0.0.1:54321). */
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  /** Clave publicable de Supabase (sb_publishable_...). Segura en el navegador gracias a RLS. */
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  /** Site key de Cloudflare Turnstile (pública). */
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
});

const esquemaServidor = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Clave secreta de Turnstile, para verificar el token en el servidor. */
  TURNSTILE_SECRET_KEY: z.string().min(1),
  /** API key de Resend (re_...). */
  RESEND_API_KEY: z.string().startsWith("re_"),
  /**
   * Sal secreta para calcular el hash de las IP en el rate limiting.
   * Así nunca se almacena la IP en texto plano. Generar con: openssl rand -hex 32
   */
  RATE_LIMIT_SALT: z.string().min(32, "RATE_LIMIT_SALT debe tener al menos 32 caracteres"),
  /**
   * Secreto compartido con las funciones crear_lead() y verificar_rate_limit() de
   * la base de datos (guardado en Supabase Vault como "formulario_secreto").
   * Impide que alguien cree leads llamando directamente a la API de Supabase con la
   * clave pública. NO es la service_role key: solo habilita esas dos funciones.
   */
  SUPABASE_FORMULARIO_SECRETO: z
    .string()
    .min(32, "SUPABASE_FORMULARIO_SECRETO debe tener al menos 32 caracteres"),
  /**
   * Opcional. URL de Supabase vista DESDE EL SERVIDOR cuando difiere de la del
   * navegador. Caso típico: la app corre en Docker y Supabase local en el host,
   * donde 127.0.0.1 apunta al propio contenedor → usar http://host.docker.internal:54321.
   */
  SUPABASE_INTERNAL_URL: z.url().optional(),
});

export type EnvPublico = z.infer<typeof esquemaPublico>;
export type EnvServidor = z.infer<typeof esquemaServidor>;

function formatearError(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

/**
 * Variables públicas. Cada una se referencia de forma literal
 * (`process.env.NEXT_PUBLIC_X`) porque Next.js solo reemplaza accesos literales
 * al compilar; `process.env[nombre]` no funcionaría en el navegador.
 */
function cargarEnvPublico(): EnvPublico {
  const resultado = esquemaPublico.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
  if (!resultado.success) {
    throw new Error(
      `Variables de entorno públicas inválidas (se definen en tiempo de build):\n${formatearError(resultado.error)}`,
    );
  }
  return resultado.data;
}

export const envPublico: EnvPublico = cargarEnvPublico();

let cacheServidor: EnvServidor | undefined;

/**
 * Variables de servidor. Se validan de forma diferida (no al importar el módulo)
 * para que `next build` funcione sin secretos, por ejemplo al construir la imagen
 * Docker. `src/instrumentation.ts` la invoca al arrancar el servidor, de modo que
 * una configuración incompleta falla de inmediato y no en la primera petición.
 */
export function envServidor(): EnvServidor {
  if (typeof window !== "undefined") {
    throw new Error("envServidor() solo puede usarse en el servidor.");
  }
  if (!cacheServidor) {
    const resultado = esquemaServidor.safeParse(process.env);
    if (!resultado.success) {
      throw new Error(
        `Variables de entorno de servidor inválidas (se definen en runtime):\n${formatearError(resultado.error)}`,
      );
    }
    cacheServidor = resultado.data;
  }
  return cacheServidor;
}
