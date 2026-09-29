/** Deja solo los dígitos de un número de teléfono ("+56 9 1234 5678" → "56912345678"). */
export function soloDigitos(numero: string): string {
  return numero.replace(/\D/g, "");
}

/**
 * Enlace de WhatsApp con mensaje prellenado.
 * wa.me exige el número en formato internacional, solo dígitos y sin "+".
 */
export function enlaceWhatsapp(numero: string, mensaje?: string): string {
  const base = `https://wa.me/${soloDigitos(numero)}`;
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base;
}

/** Enlace para llamar desde el teléfono. */
export function enlaceTelefono(numero: string): string {
  return `tel:+${soloDigitos(numero)}`;
}

/** Los celulares chilenos (E.164) comienzan con +569; solo a ellos se ofrece WhatsApp. */
export function esCelularChileno(telefono: string): boolean {
  return /^\+569\d{8}$/.test(telefono);
}

/**
 * Formato legible de un teléfono chileno normalizado (+56 y 9 dígitos).
 * Celulares y Santiago: "+56 9 1234 5678" / "+56 2 2345 6789".
 * Otras regiones (código de área de 2 dígitos): "+56 32 234 5678".
 */
export function formatearTelefono(telefono: string): string {
  const d = soloDigitos(telefono).replace(/^56/, "");
  if (d.length !== 9) return telefono;
  return /^[29]/.test(d)
    ? `+56 ${d[0]} ${d.slice(1, 5)} ${d.slice(5)}`
    : `+56 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

/** Mensaje prellenado para responder por WhatsApp a una persona interesada. */
export function mensajeRespuestaWhatsapp(nombreCompleto: string, nombreHogar: string): string {
  const primerNombre = nombreCompleto.trim().split(/\s+/)[0] ?? "";
  const desde = nombreHogar ? ` de ${nombreHogar}` : "";
  return `Hola ${primerNombre}, te escribimos${desde} por tu solicitud de información.`;
}
