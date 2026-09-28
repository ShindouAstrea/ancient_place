/**
 * IP del visitante a partir de las cabeceras del proxy/hosting.
 *
 * En Vercel, `x-real-ip` y `x-forwarded-for` las fija la propia plataforma
 * (sobrescribe lo que envíe el cliente), por lo que son confiables.
 * En otro proveedor, verificar que su proxy haga lo mismo; si no, un atacante
 * podría enviar una IP falsa en cada petición para evadir el rate limit.
 */
export function obtenerIpCliente(cabeceras: Headers): string | null {
  const ipReal = cabeceras.get("x-real-ip")?.trim();
  if (ipReal) return ipReal;

  const reenviada = cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || null;
}
