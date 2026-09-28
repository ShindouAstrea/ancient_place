import "server-only";

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
    super(`Error de base de datos en "${operacion}" (código ${codigo ?? "desconocido"})`);
    this.name = "ErrorRepositorio";
  }
}
