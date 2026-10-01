/** "12345678-9" → "12.345.678-9" (como se lee habitualmente en Chile). */
export function formatearRut(rut: string): string {
  const [cuerpo, dv] = rut.split("-");
  if (!cuerpo || !dv) return rut;
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}
