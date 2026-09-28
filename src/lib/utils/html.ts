const ENTIDADES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapa texto para insertarlo en HTML. Imprescindible con datos ingresados por
 * usuarios (ej: correos de notificación), para evitar inyección de HTML o enlaces.
 */
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ENTIDADES[c] ?? c);
}
