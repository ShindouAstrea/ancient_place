/**
 * Se ejecuta una vez al iniciar el servidor (no durante `next build`).
 * Valida las variables de entorno de servidor para fallar de inmediato si falta
 * alguna, en lugar de hacerlo en la primera petición de un usuario.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { envServidor } = await import("@/lib/env");
  envServidor();

  if (process.env.NODE_ENV === "production") {
    const { camposPendientes } = await import("@/config/site");
    const pendientes = camposPendientes();
    if (pendientes.length > 0) {
      console.warn(
        `[site.ts] Hay ${pendientes.length} datos del negocio sin completar: ${pendientes.join(", ")}`,
      );
    }
  }
}
