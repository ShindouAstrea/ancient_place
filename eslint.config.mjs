import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

/** Zod siempre desde src/lib/zod.ts, que lo configura para la CSP del sitio. */
const ZOD_CONFIGURADO = {
  name: "zod",
  message: 'Importa desde "@/lib/zod" (Zod configurado para la CSP del sitio).',
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Desactiva reglas de estilo que Prettier ya gestiona (debe ir al final).
  prettier,
  {
    rules: {
      // Evita que datos personales terminen en logs por accidente:
      // solo se permiten console.warn/error, y deben usarse sin datos del usuario.
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/consistent-type-imports": "error",
      // Permite excluir propiedades con desestructuración: const { id, ...resto } = fila.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Arquitectura: solo los repositorios (y el proxy) acceden a Supabase.
    // Vistas, componentes, actions y services deben pasar por server/repositories.
    files: ["src/**"],
    ignores: [
      "src/server/repositories/**",
      "src/lib/supabase/**",
      "src/proxy.ts",
      "src/lib/zod.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [ZOD_CONFIGURADO],
          patterns: [
            {
              group: ["@/lib/supabase/*", "@supabase/*"],
              message:
                "Acceso a Supabase solo desde src/server/repositories (vistas → services → repositories).",
            },
          ],
        },
      ],
    },
  },
  {
    // Los archivos que sí pueden usar Supabase igual deben usar el Zod configurado.
    // (En flat config, la última regla que aplica a un archivo reemplaza a las anteriores.)
    files: ["src/server/repositories/**", "src/lib/supabase/**", "src/proxy.ts"],
    rules: { "no-restricted-imports": ["error", { paths: [ZOD_CONFIGURADO] }] },
  },
  {
    // Scripts de línea de comandos: la salida por consola es su propósito.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/types/database.ts",
    "supabase/**",
  ]),
]);
