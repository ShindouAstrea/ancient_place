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

const VARIABLES_BUILD = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
];

const faltantes = VARIABLES_BUILD.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  console.error(`Faltan variables de build: ${faltantes.join(", ")}`);
  process.exit(1);
}

const tag = process.env.IMAGE_TAG ?? "hogar-web:latest";
const args = ["build", "-t", tag, ...VARIABLES_BUILD.flatMap((v) => ["--build-arg", v]), "."];

const { status } = spawnSync("docker", args, { stdio: "inherit", env: process.env });
process.exit(status ?? 1);
