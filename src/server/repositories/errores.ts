import "server-only";

/**
 * Pistas para los códigos que indican un problema de CONFIGURACIÓN (no de datos),
 * para que el log diga qué revisar. Ninguna contiene datos personales.
 */
const PISTAS: Record<string, string> = {
  "55000":
    "falta el secreto 'formulario_secreto' en Supabase Vault, o tiene menos de 32 caracteres. " +
    "Ver README: «Secreto del formulario en producción»",
  "42501":
    "permiso denegado: si ocurre en crear_lead o verificar_rate_limit, SUPABASE_FORMULARIO_SECRETO " +
    "no coincide con el secreto 'formulario_secreto' guardado en Supabase Vault",
  PGRST202: "la función no existe en la base de datos: faltan migraciones (corepack pnpm db:push)",
  PGRST205: "la tabla no existe en la base de datos: faltan migraciones (corepack pnpm db:push)",
};

/**
 * Error de acceso a datos SIN información personal.
 *
 * Los errores de PostgreSQL pueden incluir la fila completa en `details`
 * ("Failing row contains (...)"), con nombre, teléfono o correo. Por eso solo se
 * conserva el código (ej: 23514, 42501), que es seguro para registrar en logs.
 */
export class ErrorRepositorio extends Error {
  constructor(
    public readonly operacion: string,
    public readonly codigo: string | undefined,
  ) {
    const pista = codigo ? PISTAS[codigo] : undefined;
    super(
      `Error de base de datos en "${operacion}" (código ${codigo ?? "desconocido"})` +
        (pista ? `: ${pista}` : ""),
    );
    this.name = "ErrorRepositorio";
  }
}
