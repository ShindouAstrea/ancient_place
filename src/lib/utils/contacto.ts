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
