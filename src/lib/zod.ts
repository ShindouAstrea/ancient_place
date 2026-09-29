import { z } from "zod";

/**
 * Zod configurado para este proyecto: importar siempre desde aquí (`@/lib/zod`), nunca
 * directo desde "zod" (ESLint lo exige).
 *
 * jitless: Zod no intenta acelerar la validación compilando código con `new Function`.
 * La CSP del sitio prohíbe eval, y la sola prueba que hace Zod para detectarlo (aunque
 * falle en silencio) queda registrada en el navegador como una violación de seguridad.
 */
z.config({ jitless: true });

export { z };
