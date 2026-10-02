/**
 * «Recordar mis datos en este dispositivo» (ingreso al panel), del lado del navegador:
 * - El correo y la preferencia se guardan en localStorage. La contraseña, NUNCA: la guarda
 *   el gestor de contraseñas del navegador (cifrada), si la persona acepta. En Chrome, Edge
 *   y Android se le pide con la Credential Management API; Safari y Firefox lo ofrecen por
 *   su cuenta al ingresar.
 * - La duración de la sesión la decide el servidor (ver lib/supabase/config.ts).
 */

const CLAVE_RECORDAR = "panel:recordar";
const CLAVE_CORREO = "panel:correo";

/** localStorage puede no existir o lanzar un error (navegación privada, datos bloqueados). */
function leer(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: string | null) {
  try {
    if (valor === null) window.localStorage.removeItem(clave);
    else window.localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento disponible: simplemente no se recuerda.
  }
}

export function datosRecordados(): { recordar: boolean; correo: string } {
  const recordar = leer(CLAVE_RECORDAR) === "1";
  return { recordar, correo: recordar ? (leer(CLAVE_CORREO) ?? "") : "" };
}

/** Sin «recordar», se olvida también el correo guardado antes. */
export function guardarPreferencia(recordar: boolean, correo: string) {
  escribir(CLAVE_RECORDAR, recordar ? "1" : null);
  escribir(CLAVE_CORREO, recordar ? correo : null);
}

type ConstructorCredencial = new (datos: {
  id: string;
  password: string;
  name?: string;
}) => Credential;

function crearCredencial(correo: string, contrasena: string): Credential | null {
  // Solo existe en navegadores basados en Chromium (no está en los tipos de TypeScript).
  const Constructor = (window as unknown as { PasswordCredential?: ConstructorCredencial })
    .PasswordCredential;
  if (!Constructor || !navigator.credentials) return null;
  try {
    return new Constructor({ id: correo, password: contrasena, name: correo });
  } catch {
    return null;
  }
}

/** Pide al navegador guardar (o actualizar) la contraseña en su gestor. */
async function guardarEnNavegador(credencial: Credential | null) {
  if (!credencial) return;
  try {
    await navigator.credentials.store(credencial);
  } catch {
    // El navegador puede negarse (ej: la persona desactivó el gestor): no es un error.
  }
}

/**
 * Credencial del ingreso en curso, solo en memoria. Se ofrece recién al llegar al panel
 * (ofrecerCredencialPendiente), es decir, solo si el ingreso fue exitoso: una contraseña
 * incorrecta nunca se ofrece para guardar.
 */
let pendiente: Credential | null = null;

export function prepararCredencial(correo: string, contrasena: string) {
  pendiente = crearCredencial(correo, contrasena);
}

export function descartarCredencial() {
  pendiente = null;
}

export function ofrecerCredencialPendiente() {
  const credencial = pendiente;
  pendiente = null;
  return guardarEnNavegador(credencial);
}

/** Tras cambiar la contraseña: actualiza la guardada, si la persona eligió recordar. */
export function actualizarCredencial(correo: string, contrasena: string) {
  if (!datosRecordados().recordar) return Promise.resolve();
  return guardarEnNavegador(crearCredencial(correo, contrasena));
}
