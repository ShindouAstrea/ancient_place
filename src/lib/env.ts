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

/** Trata "" como "no definida" (algunos paneles y `--build-arg` sin valor dejan cadenas vacías). */
const vacioComoIndefinido = (valor: unknown) => (valor === "" ? undefined : valor);

/** Interruptor booleano en texto ("true"/"false", "1"/"0", "yes"/"no"...). */
const interruptor = (porDefecto: boolean) =>
  z.preprocess(vacioComoIndefinido, z.stringbool().default(porDefecto));

const esquemaPublico = z
  .object({
    /** URL pública del sitio, ej: https://dominio.cl (sin "/" final). */
    NEXT_PUBLIC_SITE_URL: z.url().transform((url) => url.replace(/\/+$/, "")),
    /** URL del proyecto Supabase (local: http://127.0.0.1:54321). */
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    /** Clave publicable de Supabase (sb_publishable_...). Segura en el navegador gracias a RLS. */
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    /**
     * Interruptor del CAPTCHA (Cloudflare Turnstile) en el formulario de contacto y en el
     * login del panel. Activo por defecto; "false" lo desactiva (ej: mientras no se
     * configura Turnstile). Desactivado, quedan el honeypot, el rate limit y el secreto
     * del formulario, pero los bots avanzados tienen menos barreras.
     */
    NEXT_PUBLIC_TURNSTILE_ENABLED: interruptor(true),
    /** Site key de Cloudflare Turnstile (pública). Obligatoria solo con el CAPTCHA activo. */
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.preprocess(vacioComoIndefinido, z.string().optional()),
  })
  .superRefine((env, ctx) => {
    if (env.NEXT_PUBLIC_TURNSTILE_ENABLED && !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["NEXT_PUBLIC_TURNSTILE_SITE_KEY"],
        message:
          'obligatoria con el CAPTCHA activo. Defínela o desactiva el CAPTCHA con NEXT_PUBLIC_TURNSTILE_ENABLED="false"',
      });
    }
  });

const esquemaServidor = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /** Clave secreta de Turnstile. Obligatoria solo con el CAPTCHA activo. */
    TURNSTILE_SECRET_KEY: z.preprocess(vacioComoIndefinido, z.string().optional()),
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
  })
  .superRefine((env, ctx) => {
    if (envPublico.NEXT_PUBLIC_TURNSTILE_ENABLED && !env.TURNSTILE_SECRET_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["TURNSTILE_SECRET_KEY"],
        message:
          'obligatoria con el CAPTCHA activo. Defínela o desactiva el CAPTCHA con NEXT_PUBLIC_TURNSTILE_ENABLED="false"',
      });
    }
  });

export type EnvPublico = z.infer<typeof esquemaPublico>;
export type EnvServidor = z.infer<typeof esquemaServidor>;

function formatearError(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

/**
 * URL pública del sitio:
 * - NEXT_PUBLIC_SITE_URL si está definida (se admite sin protocolo: "dominio.cl").
 * - Si no, en Vercel, su dominio de producción (NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
 *   que Vercel define automáticamente, sin protocolo).
 */
function urlDelSitio(): string | undefined {
  const valor =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!valor) return undefined;
  return /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
}

/**
 * Variables públicas. Cada una se referencia de forma literal
 * (`process.env.NEXT_PUBLIC_X`) porque Next.js solo reemplaza accesos literales
 * al compilar; `process.env[nombre]` no funcionaría en el navegador.
 */
function cargarEnvPublico(): EnvPublico {
  const resultado = esquemaPublico.safeParse({
    NEXT_PUBLIC_SITE_URL: urlDelSitio(),
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_TURNSTILE_ENABLED: process.env.NEXT_PUBLIC_TURNSTILE_ENABLED,
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

/** Configuración del CAPTCHA lista para usar (evita revisar el interruptor y la clave por separado). */
export const captcha: { activo: true; siteKey: string } | { activo: false } =
  envPublico.NEXT_PUBLIC_TURNSTILE_ENABLED && envPublico.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    ? { activo: true, siteKey: envPublico.NEXT_PUBLIC_TURNSTILE_SITE_KEY }
    : { activo: false };

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
