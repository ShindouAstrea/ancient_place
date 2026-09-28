/** Une clases CSS ignorando valores falsos. Suficiente para este proyecto (sin dependencias). */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(" ");
}
