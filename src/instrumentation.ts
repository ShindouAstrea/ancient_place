/**
 * Se ejecuta una vez al iniciar el servidor (no durante `next build`).
 * Valida las variables de entorno de servidor para fallar de inmediato si falta
 * alguna, en lugar de hacerlo en la primera petición de un usuario.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { captcha, envServidor } = await import("@/lib/env");
  const env = envServidor();

  if (process.env.NODE_ENV === "production") {
    if (!captcha.activo) {
      console.warn(
        '[seguridad] CAPTCHA desactivado (NEXT_PUBLIC_TURNSTILE_ENABLED="false"). ' +
          "Configúralo antes de publicar el sitio definitivamente (ver README).",
      );
    }
    if (!env.RESEND_API_KEY) {
      console.warn(
        "[correo] RESEND_API_KEY no configurada: no se enviarán avisos de nuevos contactos " +
          "por correo. Los contactos se guardan igual y se ven en /admin/leads.",
      );
    }

    const { camposPendientes } = await import("@/config/site");
    const pendientes = camposPendientes();
    if (pendientes.length > 0) {
      console.warn(
        `[site.ts] Hay ${pendientes.length} datos del negocio sin completar: ${pendientes.join(", ")}`,
      );
    }
  }
}
