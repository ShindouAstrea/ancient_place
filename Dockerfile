# syntax=docker/dockerfile:1

# =============================================================================
# Imagen Docker multi-stage:  deps → builder → runner   (+ "dev" para desarrollo)
#
# IMPORTANTE — variables NEXT_PUBLIC_*:
#   Next.js las incrusta en el JavaScript durante `next build`, por lo que deben
#   pasarse como --build-arg. Cambiarlas exige reconstruir la imagen.
#   Las variables secretas de runtime (RESEND_API_KEY, TURNSTILE_SECRET_KEY, ...)
#   NO van aquí: se entregan al ejecutar el contenedor (docker run --env-file ...).
#   Ver .env.example y README.
# =============================================================================

# Versión fijada de Node LTS. Actualizar de forma deliberada, nunca usar "latest".
ARG NODE_VERSION=24.21.0

# -----------------------------------------------------------------------------
# base: Node + pnpm (vía corepack; versión tomada de "packageManager" en package.json)
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
ENV COREPACK_HOME=/opt/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
# corepack fijado: la versión incluida en Node puede no soportar el pnpm del proyecto.
RUN apk add --no-cache libc6-compat \
    && npm install -g corepack@0.34.0 \
    && corepack enable pnpm
WORKDIR /app

# -----------------------------------------------------------------------------
# deps: instala dependencias con el lockfile exacto (capa cacheable)
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# -----------------------------------------------------------------------------
# dev: solo para docker-compose (hot reload). El código se monta como volumen.
# -----------------------------------------------------------------------------
FROM deps AS dev
ENV NODE_ENV=development
RUN mkdir -p .next && chown -R node:node /app
USER node
EXPOSE 3000
# Escucha en 0.0.0.0 para ser accesible desde fuera del contenedor.
CMD ["node_modules/.bin/next", "dev", "--hostname", "0.0.0.0"]

# -----------------------------------------------------------------------------
# builder: compila la aplicación (salida "standalone")
# -----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables públicas de BUILD (se incrustan en el bundle del navegador).
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY \
    NODE_ENV=production

RUN pnpm build

# -----------------------------------------------------------------------------
# runner: imagen final mínima. Sin pnpm, sin código fuente, sin devDependencies.
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

# PORT y HOSTNAME los respeta el server.js de la salida standalone.
# Proveedores como Koyeb o Cloud Run asignan PORT por variable de entorno.
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Usuario sin privilegios "node" (incluido en la imagen oficial de Node).
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

# Usa fetch nativo de Node (la imagen alpine no trae curl) y respeta PORT.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
