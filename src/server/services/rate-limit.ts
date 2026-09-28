import "server-only";

import { createHmac } from "node:crypto";

import { envServidor } from "@/lib/env";
import { registrarIntento, type AccionLimitada } from "@/server/repositories/rate-limits";

/**
 * Hash de la IP con HMAC-SHA256 y una sal secreta (RATE_LIMIT_SALT).
 * - La IP nunca se guarda en texto plano.
 * - Con la sal secreta, el hash no puede revertirse probando las ~4 mil millones
 *   de IPv4 posibles (un SHA-256 simple sí podría).
 */
export function hashearIp(ip: string | null): string {
  return createHmac("sha256", envServidor().RATE_LIMIT_SALT)
    .update(ip ?? "ip-desconocida")
    .digest("hex");
}

/** true si la IP puede realizar la acción; false si superó el límite. */
export async function permitirIntento(ip: string | null, accion: AccionLimitada) {
  return registrarIntento(hashearIp(ip), accion);
}
