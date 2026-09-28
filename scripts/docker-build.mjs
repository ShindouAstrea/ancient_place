/**
 * Construye la imagen Docker de producción pasando las variables NEXT_PUBLIC_*
 * como build args (Next.js las incrusta durante el build).
 *
 * Uso:
 *   pnpm docker:build                       # lee .env.production.local
 *   pnpm docker:build .env.otro             # otro archivo
 *   IMAGE_TAG=hogar-web:1.0 pnpm docker:build
 *
 * Los valores se pasan como "--build-arg NOMBRE" (sin "=valor"): Docker los toma
 * del entorno del proceso, así no quedan impresos en la terminal.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const archivo = process.argv[2] ?? ".env.production.local";
if (existsSync(archivo)) {
  process.loadEnvFile(archivo);
  console.log(`Variables de build leídas de ${archivo}`);
} else {
  console.warn(`No existe ${archivo}; se usarán las variables del entorno actual.`);
}

const OBLIGATORIAS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];
// La clave de Turnstile solo es obligatoria con el CAPTCHA activo: lo valida
// src/lib/env.ts durante el build, con un mensaje claro si falta.
const OPCIONALES = ["NEXT_PUBLIC_TURNSTILE_ENABLED", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"];

const faltantes = OBLIGATORIAS.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  console.error(`Faltan variables de build: ${faltantes.join(", ")}`);
  process.exit(1);
}

const tag = process.env.IMAGE_TAG ?? "hogar-web:latest";
const args = [
  "build",
  "-t",
  tag,
  ...[...OBLIGATORIAS, ...OPCIONALES].flatMap((v) => ["--build-arg", v]),
  ".",
];

const { status } = spawnSync("docker", args, { stdio: "inherit", env: process.env });
process.exit(status ?? 1);
