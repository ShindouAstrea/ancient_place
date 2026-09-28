/**
 * Healthcheck de liveness para Docker y proveedores de hosting.
 * No consulta la base de datos a propósito: si Supabase tuviera un problema
 * temporal, el orquestador no debería reiniciar el contenedor por ello.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
