# [NOMBRE DEL HOGAR] — Sitio web

Landing page y panel de administración de un hogar de reposo para adultos mayores.
Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · Resend · Docker.

El contenido del sitio (nombre, contacto, horario, fotos, servicios, testimonios…) se edita
desde el panel, en `/admin/sitio`: no hace falta tocar código ni volver a desplegar.

## Índice

1. [Requisitos](#1-requisitos)
2. [Desarrollo local](#2-desarrollo-local)
3. [Variables de entorno: build vs runtime](#3-variables-de-entorno-build-vs-runtime)
4. [Puesta en producción, paso a paso](#4-puesta-en-producción-paso-a-paso)
5. [Panel de administración](#5-panel-de-administración)
6. [Dónde editar los textos del sitio](#6-dónde-editar-los-textos-del-sitio)
7. [SEO](#7-seo)
8. [Formulario de contacto: capas de seguridad](#8-formulario-de-contacto-capas-de-seguridad)
9. [Checklist de seguridad antes de publicar](#9-checklist-de-seguridad-antes-de-publicar)
10. [Actualizar producción cuando cambia el código](#10-actualizar-producción-cuando-cambia-el-código)

---

## 1. Requisitos

- **Node.js 24 LTS** (mínimo 22.12). Ver `.nvmrc`.
- **pnpm** vía corepack: `corepack enable pnpm` (la versión se toma de `packageManager`).
  En Windows, si Node está instalado en `C:\Program Files`, ese comando requiere una terminal
  **como administrador**. Alternativa sin permisos: anteponer `corepack` a cada comando
  (`corepack pnpm dev`, `corepack pnpm db:start`, etc.).
- **Docker Desktop** (o Docker Engine + Compose v2). Lo necesita Supabase local.
- **Supabase CLI**: viene como dependencia de desarrollo, no hay que instalarla aparte
  (`pnpm exec supabase ...`).

## 2. Desarrollo local

### Sin Docker (recomendado para el día a día)

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local   # los valores de ejemplo ya sirven en local
pnpm db:start                # Supabase local (ver abajo)
pnpm dev                     # http://localhost:3000
```

**El sitio web está en http://localhost:3000** (se detiene con Ctrl+C). `pnpm db:start` no lo
inicia: los puertos 5432x son solo de Supabase.

### Base de datos local (Supabase)

Requiere Docker en ejecución. La primera vez descarga varias imágenes (unos minutos).

```bash
pnpm db:start     # levanta Supabase local, aplica migraciones y seed.sql
pnpm db:test      # verifica las políticas de seguridad (deben pasar todos los tests)
```

| Servicio                         | URL                    | Para qué sirve                                                                                                         |
| -------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| API (`NEXT_PUBLIC_SUPABASE_URL`) | http://127.0.0.1:54321 | La usa la app, no el navegador. Es normal que la raíz responda `no Route matched`: solo atiende rutas como `/rest/v1`. |
| Studio (panel visual)            | http://127.0.0.1:54323 | Ver y editar datos (ej: Table Editor → `leads`).                                                                       |
| Mailpit (correos capturados)     | http://127.0.0.1:54324 | Correos que Supabase Auth enviaría (ej: recuperar contraseña). Los avisos del formulario van por Resend.               |

- La _Publishable key_ local es fija y ya viene en `.env.example`.
- `supabase/seed.sql` carga contenido de ejemplo, contactos ficticios y un administrador de
  prueba: **`admin@example.com`** / **`admin-local-12345`**. Nunca se aplica en producción.
- **Cambios de esquema:** crear una migración con `pnpm exec supabase migration new <nombre>`,
  escribir el SQL, aplicar con `pnpm db:reset` y regenerar los tipos con `pnpm db:types`.
  Toda tabla nueva debe tener RLS habilitado (el test `db:test` falla si no).
- `supabase/config.toml` solo configura Supabase **local**. La configuración de producción se
  hace en el Dashboard (ver [4.4](#44-configurar-supabase-auth)); no uses
  `supabase config push` sin revisarlo (tiene claves de prueba).

### Con Docker

```bash
cp .env.example .env.local
pnpm db:start                # Supabase local (fuera del compose)
pnpm docker:dev              # docker compose up --build → http://localhost:3000
```

El código se monta como volumen, por lo que los cambios se recargan en caliente (en unos 3
segundos).

> **Por qué el contenedor usa webpack y polling:** Docker Desktop en Windows y macOS no
> propaga los eventos de cambio de archivos a través de los bind mounts. Por eso el
> contenedor revisa los archivos periódicamente (`WATCHPACK_POLLING=true`), lo que consume
> algo más de CPU. Turbopack no detectó cambios sobre un mount de Windows ni siquiera con
> polling (probado con Next 16.3), así que dentro de Docker se usa `next dev --webpack`.
> Con `pnpm dev` fuera de Docker se sigue usando Turbopack, que es más rápido. Para mejorar
> el rendimiento en Windows, clona el repositorio dentro de WSL 2 (`/home/usuario/...`).

#### Conectar la app en Docker con Supabase local

Supabase local se levanta con su CLI, que crea sus propios contenedores (no se replica en
`docker-compose.yml`). Hay **dos clientes** que deben llegar a Supabase:

| Quién se conecta                    | Desde dónde          | URL                                 |
| ----------------------------------- | -------------------- | ----------------------------------- |
| Navegador (código cliente)          | Tu equipo            | `http://127.0.0.1:54321`            |
| Servidor Next.js (dentro de Docker) | Contenedor de la app | `http://host.docker.internal:54321` |

Dentro del contenedor, `127.0.0.1` apunta al propio contenedor, no a tu equipo. Por eso:

- `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` en `.env.local` (lo usa el navegador).
- `docker-compose.yml` define `SUPABASE_INTERNAL_URL=http://host.docker.internal:54321`
  para el código de servidor, y `extra_hosts: host-gateway` para que ese nombre exista
  también en Linux.

Alternativa: unir el contenedor a la red que crea la CLI (`supabase_network_<project_id>`)
y usar `http://supabase_kong_<project_id>:8000` como `SUPABASE_INTERNAL_URL`.

### Scripts

| Script              | Descripción                                           |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo                                |
| `pnpm build`        | Build de producción (salida `standalone`)             |
| `pnpm start`        | Sirve el build de producción                          |
| `pnpm lint`         | ESLint                                                |
| `pnpm typecheck`    | Verificación de tipos con TypeScript                  |
| `pnpm format`       | Formatea con Prettier (`format:check` solo revisa)    |
| `pnpm db:start`     | Levanta Supabase local                                |
| `pnpm db:stop`      | Detiene Supabase local                                |
| `pnpm db:reset`     | Recrea la base local: migraciones + `seed.sql`        |
| `pnpm db:test`      | Tests de seguridad (RLS y privilegios) con pgTAP      |
| `pnpm db:migrate`   | Aplica migraciones pendientes a Supabase local        |
| `pnpm db:push`      | Aplica migraciones al proyecto remoto vinculado       |
| `pnpm db:types`     | Genera `src/types/database.ts` desde el esquema local |
| `pnpm docker:dev`   | Desarrollo en Docker con hot reload                   |
| `pnpm docker:build` | Construye la imagen de producción                     |

**Integración continua:** en cada push a `master`, GitHub Actions
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) ejecuta lint, typecheck, revisión
de formato y el build de la imagen Docker (sin publicarla).

## 3. Variables de entorno: build vs runtime

Todas están documentadas en [`.env.example`](.env.example) y se validan con Zod en
[`src/lib/env.ts`](src/lib/env.ts).

| Tipo                   | Variables                                                                                                                                                     | Cuándo se definen                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Build** (públicas)   | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TURNSTILE_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Al ejecutar `next build`. En Docker, como `--build-arg`. Cambiarlas exige reconstruir. |
| **Runtime** (secretas) | `RATE_LIMIT_SALT`, `SUPABASE_FORMULARIO_SECRETO`; opcionales: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `SUPABASE_INTERNAL_URL`                               | Al iniciar el servidor. En Docker, con `--env-file` o `-e`.                            |

Las variables `NEXT_PUBLIC_*` quedan **incrustadas en el código que descarga el navegador**:
nunca pongas un secreto en una variable con ese prefijo.

Las variables de runtime se validan al arrancar (`src/instrumentation.ts`): si falta una
obligatoria, el servidor no inicia y las páginas dinámicas (formulario, panel) responden
error 500; el motivo exacto aparece en los logs (en Vercel: Project → Logs).
`SUPABASE_SERVICE_ROLE_KEY` **no se usa** en este proyecto.

- **Generar `RATE_LIMIT_SALT` y `SUPABASE_FORMULARIO_SECRETO`:** no se obtienen de ningún
  servicio; son valores aleatorios que se generan una vez (uno distinto para cada una):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- **`RESEND_API_KEY` (opcional):** envía el correo de aviso cuando llega un contacto. Sin ella
  el aviso se omite, pero los contactos se guardan igual y se ven en `/admin/leads`.
- **`NEXT_PUBLIC_SITE_URL`:** la dirección pública definitiva (`https://dominio.cl`). Admite el
  dominio sin protocolo (`dominio.cl`). En Vercel puede omitirse mientras no haya dominio: se
  usa el dominio de producción del proyecto. La usan los enlaces canónicos, el sitemap y la
  imagen para compartir.
- **CAPTCHA opcional:** `NEXT_PUBLIC_TURNSTILE_ENABLED="false"` desactiva Turnstile en el
  formulario de contacto y en el panel; entonces `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y
  `TURNSTILE_SECRET_KEY` pueden omitirse. Por defecto está **activo**. Siguen protegiendo el
  honeypot, el rate limit y el secreto del formulario, pero conviene activarlo antes de
  publicar definitivamente (el servidor lo recuerda en los logs al arrancar). Si se desactiva
  aquí, también debe estar desactivado en Supabase (Authentication → CAPTCHA), o el login
  del panel será rechazado.

## 4. Puesta en producción, paso a paso

Orden recomendado: Supabase → Vercel (con la URL de Vercel) → dominio `.cl` → Resend. Los
nombres de los menús de cada servicio pueden variar levemente entre versiones.

### 4.1 Crear el proyecto en Supabase (región São Paulo)

1. En https://supabase.com/dashboard → **New project**.
2. Nombre del proyecto, **Database Password** (usa "Generate" y guárdala en tu gestor de
   contraseñas) y **Region: South America (São Paulo)**, la más cercana a Chile: menos
   latencia para el sitio y el panel.
3. Cuando termine de crearse, anota:
   - **Project URL** (`https://<ref>.supabase.co`) → `NEXT_PUBLIC_SUPABASE_URL`. El `<ref>`
     es el identificador del proyecto.
   - **Publishable key** (`sb_publishable_...`, en Project Settings → API Keys) →
     `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **No** uses la _secret key_ ni la `service_role`.

### 4.2 Vincular el repositorio y aplicar las migraciones

```bash
pnpm exec supabase login                       # abre el navegador para autorizar la CLI
pnpm exec supabase link --project-ref <ref>    # pide la Database Password
pnpm db:push                                   # aplica supabase/migrations al proyecto
pnpm exec supabase migration list              # local y remoto deben coincidir
```

`db:push` aplica solo las migraciones (tablas, funciones, RLS, bucket de fotos); **nunca**
el `seed.sql`. El sitio parte con el nombre genérico «Hogar de reposo» y las secciones vacías
ocultas, hasta completarlas en el panel.

### 4.3 Secreto del formulario en Supabase Vault

Los contactos solo se guardan con la función `crear_lead()`, que exige un secreto guardado en
**Supabase Vault** y conocido únicamente por el servidor Next. En local ya viene en
`seed.sql`. En producción, **una sola vez**:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # genera el secreto
```

1. Supabase Dashboard → SQL Editor, ejecutar (con el valor generado):
   ```sql
   select vault.create_secret('<SECRETO_GENERADO>', 'formulario_secreto');
   ```
2. Configurar el mismo valor como `SUPABASE_FORMULARIO_SECRETO` en Vercel (o en el proveedor).

Para rotarlo: `select vault.update_secret((select id from vault.secrets where name = 'formulario_secreto'), '<NUEVO>');`
y actualizar la variable. Si el secreto falta o no coincide, el formulario y el login dejan de
funcionar (fallan de forma cerrada) y el servidor lo registra en los logs (código `55000`).

### 4.4 Configurar Supabase Auth

1. **Registro público:** Authentication → Sign In / Providers → desactivar **Allow new users
   to sign up**. Mantener habilitado el proveedor **Email** (lo usa el ingreso con contraseña).
2. **Largo mínimo de contraseña:** en el proveedor Email, **Minimum password length** = `8`.
   Opcional (plan Pro): activar **Prevent use of leaked passwords**.
3. **Site URL:** Authentication → URL Configuration → **Site URL** = la dirección pública del
   sitio, sin `/` al final (ej: `https://dominio.cl`, o la de Vercel mientras no haya
   dominio). El enlace de recuperación de contraseña se arma con ella: si cambias de dominio,
   actualízala.
4. **Correo de recuperación en español:** Authentication → Emails → Templates → **Reset
   Password**. Asunto: `Restablece tu contraseña del panel`; cuerpo: pegar el contenido de
   [`supabase/templates/recuperar-contrasena.html`](supabase/templates/recuperar-contrasena.html).
   **Obligatorio:** la plantilla por defecto de Supabase enlaza a otra dirección y con ella la
   recuperación no funciona.
   En la misma sección, aviso de seguridad **Password changed**: activarlo, asunto
   `Tu contraseña del panel cambió` y cuerpo de
   [`supabase/templates/contrasena-cambiada.html`](supabase/templates/contrasena-cambiada.html).
5. **Envío de correos de Supabase (SMTP):** estos correos los envía Supabase Auth, no la app.
   El servicio incluido en Supabase **solo entrega a los correos de los miembros de tu
   organización en Supabase** y permite muy pocos correos por hora: no sirve para producción.
   Configura Resend como SMTP en Authentication → Emails → **SMTP Settings** (requiere
   [4.9](#49-resend-correos-y-verificación-del-dominio-cl)):

   | Campo        | Valor                                                                        |
   | ------------ | ---------------------------------------------------------------------------- |
   | Host         | `smtp.resend.com`                                                            |
   | Port         | `465`                                                                        |
   | Username     | `resend`                                                                     |
   | Password     | una API key de Resend (conviene crear una aparte, solo para esto)            |
   | Sender email | un correo de tu dominio verificado en Resend (ej: `no-responder@dominio.cl`) |
   | Sender name  | el nombre del hogar                                                          |

   Mientras no verifiques tu dominio en Resend, usa `onboarding@resend.dev` como Sender
   email: así solo llegan correos a la dirección de tu cuenta de Resend. Con SMTP propio, sube
   el cupo en Authentication → Rate Limits (ej: 30 correos por hora).

6. **CAPTCHA** (cuando se active Turnstile en el sitio): Authentication → Attack Protection →
   activar **CAPTCHA protection**, proveedor **Cloudflare Turnstile**, con la **misma clave
   secreta** que `TURNSTILE_SECRET_KEY` (el par de `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), y quitar
   `NEXT_PUBLIC_TURNSTILE_ENABLED="false"` en Vercel (requiere un nuevo deploy). Ambos lados
   deben coincidir: activo en los dos o desactivado en los dos. Las claves se crean en
   Cloudflare → Turnstile → Add widget, con el dominio del sitio.
7. Opcional (plan Pro): Authentication → Sessions → limitar la duración de las sesiones.

### 4.5 Crear el primer administrador

Solo la **primera** cuenta se crea a mano (alguien tiene que poder entrar a crear las demás).
Las siguientes se crean desde el panel, en **Usuarios** (`/admin/usuarios`, ver
[Usuarios](#usuarios)).

1. Supabase Dashboard → **Authentication → Users → Add user → Create new user**: correo,
   contraseña (8 caracteres o más) y marcar **Auto Confirm User**.
2. SQL Editor:
   ```sql
   insert into public.admins (user_id, email, nombre)
   select id, email, 'Tu nombre' from auth.users where email = 'persona@dominio.cl';

   -- Todos los roles: usuarios y permisos, sitio web y contactos, fichas (ver y editar).
   insert into public.admin_roles (user_id, rol)
   select user_id, r::public.rol_admin
   from public.admins, unnest(array['usuarios', 'sitio', 'pacientes']) as r
   where email = 'persona@dominio.cl';
   ```

Si ya tenías administradores antes de que existiera la gestión de usuarios, la migración le
dio el rol `usuarios` a quienes tenían `sitio` y `pacientes`: no hace falta repetir esto.

**Cada persona debe tener su propia cuenta** (nunca compartidas): así el historial de las
fichas indica quién hizo cada cosa.

### 4.6 Desplegar en Vercel

**Vercel no usa el `Dockerfile`:** detecta Next.js y compila con su propia infraestructura
(`pnpm build`, con la versión de pnpm de `packageManager`). El Dockerfile es para otros
proveedores ([4.10](#410-docker-en-otro-proveedor)).

1. https://vercel.com → **Add New → Project** → importar el repositorio de GitHub.
   Framework: Next.js (se detecta solo).
2. **Environment Variables** (entorno _Production_; marca las secretas como **Sensitive**):

   | Variable                               | Valor                                                                                        |
   | -------------------------------------- | -------------------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SITE_URL`                 | `https://dominio.cl` (vacía mientras no haya dominio)                                        |
   | `NEXT_PUBLIC_SUPABASE_URL`             | Project URL de [4.1](#41-crear-el-proyecto-en-supabase-región-são-paulo)                     |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key de 4.1                                                                       |
   | `NEXT_PUBLIC_TURNSTILE_ENABLED`        | `false` hasta configurar Turnstile                                                           |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`       | clave pública de Turnstile (si está activo)                                                  |
   | `TURNSTILE_SECRET_KEY`                 | clave secreta de Turnstile (si está activo) — Sensitive                                      |
   | `RATE_LIMIT_SALT`                      | valor aleatorio generado — Sensitive                                                         |
   | `SUPABASE_FORMULARIO_SECRETO`          | el mismo secreto de Vault de [4.3](#43-secreto-del-formulario-en-supabase-vault) — Sensitive |
   | `RESEND_API_KEY`                       | API key de Resend (opcional) — Sensitive                                                     |

3. **Deploy.** Luego, en Settings → Functions → **Function Region**, elige **São Paulo
   (gru1)**: queda junto a la base de datos y el sitio responde más rápido.
4. Entra a `https://<proyecto>.vercel.app/admin` con el administrador de 4.5 y completa
   `/admin/sitio`.

- **Cambiar una `NEXT_PUBLIC_*` exige volver a desplegar** (Deployments → ⋯ → Redeploy): se
  incrustan al compilar. Las secretas se leen al arrancar, pero también requieren redeploy
  para tomar el valor nuevo.
- Cada push a la rama de producción despliega solo. Las _Preview Deployments_ (otras ramas)
  están protegidas por Vercel Authentication y Vercel les agrega `noindex`.

### 4.7 Dominio .cl: de NIC Chile a Vercel

NIC Chile registra el dominio pero no aloja sus registros DNS: solo indica qué **servidores de
nombre** responden por él. Lo más simple es delegarlo a Vercel, que además crea el
certificado HTTPS.

1. **Primero en Vercel:** Project → Settings → **Domains** → Add → `dominio.cl`. Acepta
   agregar también `www.dominio.cl` con redirección a `dominio.cl`. Elige la opción de
   **nameservers de Vercel**: mostrará `ns1.vercel-dns.com` y `ns2.vercel-dns.com`.
   (Agregarlo primero hace que Vercel ya responda por el dominio cuando NIC Chile lo revise.)
2. **Antes de cambiar nada**, si el dominio ya tiene correo (ej: Google Workspace o el correo
   de otro proveedor), copia sus registros MX/TXT actuales y créalos en Vercel → Domains →
   `dominio.cl` → DNS Records. Si no, el correo del dominio deja de funcionar.
3. **En NIC Chile:** https://www.nic.cl → ingresa a tu cuenta → **Mis dominios** → elige
   `dominio.cl` → **Modificar** → **Servidores de nombre (DNS)**. Reemplaza los actuales por:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

   Guarda y confirma. NIC Chile verifica que esos servidores respondan por el dominio.

4. **Espera la propagación**: normalmente de minutos a unas horas (hasta 48 h en casos
   raros). Vercel marca el dominio como **Valid Configuration** y emite el certificado HTTPS
   solo. Puedes revisar con `nslookup -type=NS dominio.cl`.
5. **Actualiza la dirección definitiva** en:
   - Vercel: `NEXT_PUBLIC_SITE_URL=https://dominio.cl` → **Redeploy**.
   - Supabase: Authentication → URL Configuration → **Site URL** = `https://dominio.cl`.
   - Cloudflare Turnstile (si está activo): agrega el dominio al widget.

**Alternativa** (si prefieres mantener el DNS en otro proveedor, ej: Cloudflare): en lugar de
cambiar los servidores de nombre, crea en ese proveedor los registros que muestra Vercel
(típicamente `A @ 76.76.21.21` y `CNAME www cname.vercel-dns.com`; usa los valores exactos
que indique Vercel). En Cloudflare, déjalos como "DNS only" (nube gris).

### 4.8 Google: Search Console y ficha del negocio

1. **Google Search Console** (https://search.google.com/search-console) → Agregar propiedad
   → **Dominio** → `dominio.cl`. Google entrega un registro TXT: créalo en Vercel → Domains →
   `dominio.cl` → DNS Records y verifica. Luego, en **Sitemaps**, envía
   `https://dominio.cl/sitemap.xml`.
2. **Perfil de Empresa de Google** (https://business.google.com): es lo que más ayuda a
   aparecer en Google Maps y en búsquedas como «hogar de reposo en [comuna]». Usa
   exactamente el mismo nombre, dirección y teléfono que en el panel.
3. Revisa los datos estructurados en https://search.google.com/test/rich-results.

### 4.9 Resend: correos y verificación del dominio .cl

Resend envía los avisos de nuevos contactos (desde la app) y, como SMTP, los correos de
Supabase Auth (recuperar contraseña). Solo envía desde dominios que verifiques con registros
DNS: por eso sirve tu `.cl`, pero no un dominio `vercel.app` (su DNS no es tuyo).

1. Crea la cuenta en https://resend.com → **API Keys** → Create API Key (permiso _Sending
   access_). Úsala como `RESEND_API_KEY` en Vercel; crea otra para el SMTP de Supabase (4.4).
2. **Domains → Add Domain** → `dominio.cl`, región **São Paulo (sa-east-1)**.
3. Resend muestra los registros que debes crear. Suelen ser (copia los **valores exactos**
   de Resend):

   | Tipo | Nombre (en Vercel)  | Valor                                                 |
   | ---- | ------------------- | ----------------------------------------------------- |
   | MX   | `send`              | `feedback-smtp.sa-east-1.amazonses.com`, prioridad 10 |
   | TXT  | `send`              | `v=spf1 include:amazonses.com ~all`                   |
   | TXT  | `resend._domainkey` | la clave DKIM (`p=MIGf...`)                           |
   | TXT  | `_dmarc` (opcional) | `v=DMARC1; p=none;`                                   |

   Créalos donde se administra el DNS del dominio: si seguiste 4.7, en Vercel → Domains →
   `dominio.cl` → DNS Records (en "Name" va solo la parte antes de `.dominio.cl`).

4. Vuelve a Resend → **Verify DNS Records**. Queda en **Verified** en minutos u horas.
5. En el panel, **Sitio web → Información → Avisos por correo**:
   - **Remitente:** `Sitio web <no-responder@dominio.cl>`.
   - **Correo que recibe los avisos:** el correo del equipo que atiende los contactos.
6. En Supabase (4.4, paso 5), cambia el **Sender email** del SMTP a
   `no-responder@dominio.cl`.
7. Prueba: envía el formulario de contacto del sitio y revisa que llegue el aviso.

Mientras el dominio no esté verificado: remitente `Sitio web <onboarding@resend.dev>`, que
solo entrega al correo de tu cuenta de Resend.

### 4.10 Docker en otro proveedor

La imagen sirve para cualquier proveedor que ejecute contenedores (Koyeb, Cloud Run,
Railway, un VPS…).

```bash
# 1. Crear .env.production.local con las variables de build y de runtime (sección 3).
# 2. Construir (lee .env.production.local y pasa las NEXT_PUBLIC_* como --build-arg):
pnpm docker:build

# 3. Ejecutar (las secretas se entregan en runtime, no quedan dentro de la imagen):
docker run --rm -p 3000:3000 --env-file .env.production.local hogar-web:latest
```

- Escucha en `0.0.0.0` y respeta la variable `PORT` (3000 por defecto), como requieren
  Koyeb o Cloud Run.
- Incluye `HEALTHCHECK` contra `/api/health` y se ejecuta con el usuario sin privilegios
  `node`.
- Las `NEXT_PUBLIC_*` quedan fijas en la imagen: si cambian, hay que reconstruirla.
- **IP del visitante:** se toma de `x-real-ip` / `x-forwarded-for`. Vercel sobrescribe esas
  cabeceras, por lo que son confiables. En otro proveedor, verifica que su proxy también lo
  haga; de lo contrario el rate limit podría evadirse falsificando la cabecera.
- Para el dominio, usa los registros A/CNAME que indique ese proveedor en vez de los de
  Vercel (4.7).

## 5. Panel de administración

| Ruta                     | Contenido                                                          |
| ------------------------ | ------------------------------------------------------------------ |
| `/admin/login`           | Ingreso con correo y contraseña                                    |
| `/admin/recuperar`       | «¿Olvidaste tu contraseña?»: envía un enlace por correo            |
| `/admin/restablecer`     | Destino del enlace: elegir la nueva contraseña                     |
| `/admin`                 | Inicio: resumen de contactos y módulos (actuales y futuros)        |
| `/admin/leads`           | Contactos en tarjetas: filtro por estado, llamar, WhatsApp, correo |
| `/admin/sitio`           | Sitio web: información, horario, fotos, servicios, testimonios…    |
| `/admin/pacientes`       | Fichas de residentes: datos, medicamentos, dosis, QR e historial   |
| `/admin/pacientes/ronda` | Ronda: dosis de hoy de todos los residentes, por hora              |
| `/admin/p/<código>`      | Destino del QR de una ficha: pide ingresar y abre la ficha         |
| `/admin/usuarios`        | Usuarios: crear cuentas, asignar permisos, desactivarlas           |
| `/admin/cuenta`          | Mi cuenta: cambiar la contraseña                                   |

### Roles

| Rol                 | Da acceso a                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `sitio`             | **Sitio web** (todo el contenido público) y **Contactos** del formulario                 |
| `pacientes`         | **Fichas de pacientes: ver y editar**, y su historial (Agenda, Inventario: próximamente) |
| `pacientes_lectura` | **Fichas de pacientes: ver y registrar dosis**, sin editar (ej: cuidadores)              |
| `usuarios`          | **Usuarios y permisos**: crear cuentas, asignar roles, desactivarlas                     |

Una persona puede tener varios roles. Cada rol se exige en el panel **y en la base de datos
(RLS)**: aunque alguien llamara directo a la API, sin el rol no puede leer ni modificar esos
datos. Las cuentas se crean desde [Usuarios](#usuarios); solo la primera, por SQL
([4.5](#45-crear-el-primer-administrador)).

### Usuarios

En el inicio del panel → **Usuarios** (rol `usuarios`; no ocupa lugar en el menú porque se usa
poco). Desde ahí:

- **Nueva cuenta:** correo, nombre y permisos. Al crearla, el panel muestra una **contraseña
  temporal** (una sola vez) para entregarle a la persona en persona o por un mensaje privado.
  Al ingresar con ella, el panel la lleva a «Mi cuenta» a elegir una propia; hasta entonces
  la base de datos no le muestra nada.
- **Nombre y permisos:** se cambian en la cuenta. El correo no se puede cambiar (si está mal,
  desactívala y crea otra).
- **Dar contraseña temporal:** para quien olvidó la suya y no le llega el correo de
  recuperación. La anterior deja de funcionar y se cierra su sesión en todos sus dispositivos.
- **Desactivar:** no puede ingresar y se cierra su sesión en todos sus dispositivos. La cuenta
  no se borra (el historial de las fichas sigue indicando quién hizo cada cosa) y se puede
  reactivar con los mismos permisos.
- **Historial de cambios:** quién creó la cuenta, cambió sus permisos, la desactivó o le dio
  una contraseña temporal, y cuándo.

Nadie puede desactivar su propia cuenta, quitarse el rol `usuarios` ni darse una contraseña
temporal: así siempre queda al menos una persona que administra usuarios.

### Entrar en local

`pnpm dev`, abrir http://localhost:3000/admin e ingresar con **`admin@example.com`** /
**`admin-local-12345`** (roles `sitio`, `pacientes` y `usuarios`) o con
**`cuidador@example.com`** / **`cuidador-local-12345`** (solo ve fichas). Solo existen en
local, junto a dos pacientes ficticios. Para probar «¿Olvidaste tu contraseña?», el correo se
ve en Mailpit (http://127.0.0.1:54324); el enlace apunta a `http://localhost:3000`
(`site_url` de `supabase/config.toml`).

### Contraseñas

- Cada administrador la cambia en **Mi cuenta** (`/admin/cuenta`): pide la actual y, al
  guardar, cierra la sesión en sus otros dispositivos.
- Si alguien la **olvidó**, usa **«¿Olvidaste tu contraseña?»** en la página de ingreso:
  recibe un enlace (vence en 1 hora, sirve una sola vez), elige una nueva y se cierran sus
  sesiones en todos los dispositivos. Requiere los pasos 3 a 5 de
  [4.4](#44-configurar-supabase-auth).
- Si el correo no llega: quien tenga el rol `usuarios` le da una **contraseña temporal** desde
  [Usuarios](#usuarios).

### «Recordar mis datos en este dispositivo»

Casilla del ingreso. **Marcada:** el navegador recuerda el correo, ofrece guardar la contraseña
en su gestor de contraseñas (cifrada; el sitio nunca la guarda) y la sesión dura **30 días
desde el último uso**. La contraseña solo se completa sola si la persona **acepta** ese
ofrecimiento del navegador: en Chrome, Edge y Android el ingreso se la pide de vuelta al gestor;
en Safari y Firefox la completa el autocompletado del navegador. **Sin marcar:** la sesión se cierra al cerrar el navegador (útil en
equipos compartidos) y se olvida el correo guardado. Ojo: si el navegador está configurado
para «continuar donde lo dejaste», puede conservar la sesión aunque se cierre; en un equipo
compartido, usa siempre **Salir**.

### Capas de seguridad del acceso

| Capa                                                                    | Protege contra                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| Registro público deshabilitado                                          | Que cualquiera cree una cuenta                 |
| Contraseñas de 8 caracteres o más                                       | Contraseñas fáciles de adivinar                |
| Rate limit: 10 intentos por hora por IP                                 | Probar contraseñas por fuerza bruta            |
| CAPTCHA (Turnstile) opcional, verificado por Supabase                   | Intentos automatizados                         |
| Mismo mensaje si el correo no existe o la contraseña es incorrecta      | Averiguar qué correos tienen cuenta            |
| Rol en la tabla `admins`, verificado en cada página y acción, más RLS   | Cuentas sin rol de administrador               |
| Roles exigidos por RLS (`tiene_rol`)                                    | Ver o editar lo que no corresponde             |
| Cuentas creadas por funciones de la base que exigen el rol `usuarios`   | Crear cuentas o darse permisos sin el rol      |
| Sin `service_role key` en la aplicación                                 | Que una filtración dé acceso a todos los datos |
| Contraseña temporal: generada al azar, se muestra una vez, no se guarda | Contraseñas débiles o reutilizadas             |
| Con contraseña temporal, la base no reconoce roles hasta cambiarla      | Que alguien más use la que se entregó          |
| Desactivar cierra todas sus sesiones y bloquea el ingreso en Auth       | Que una cuenta dada de baja siga entrando      |
| Nadie se desactiva ni se quita el rol `usuarios` a sí mismo             | Quedarse sin quien administre las cuentas      |
| Historial de cambios de cuentas, que nadie puede editar                 | Cambios de permisos sin rastro                 |
| Sin «Recordar mis datos», la sesión se borra al cerrar el navegador     | Sesiones abiertas en equipos compartidos       |
| La contraseña la guarda el gestor del navegador, nunca el sitio         | Robo de contraseñas guardadas en el sitio      |
| Cookie de sesión `httpOnly`                                             | Robo de la sesión mediante XSS                 |
| Sesión verificada contra el servidor de Auth en cada página             | Seguir usando una sesión ya cerrada            |
| Cambio de contraseña exige la actual y cierra los otros dispositivos    | Uso de un celular con sesión abierta           |
| Recuperación: 5 solicitudes por hora por IP y misma respuesta siempre   | Envío masivo de correos y sondeo de cuentas    |
| Enlace de recuperación de un solo uso, vence en 1 hora                  | Reuso de un enlace viejo                       |
| Abrir el enlace no lo gasta: se canjea recién al guardar la contraseña  | Filtros de correo que abren enlaces            |
| Al restablecer se cierran las sesiones en **todos** los dispositivos    | Que un intruso siga dentro                     |
| Aviso por correo cada vez que cambia la contraseña                      | Cambios que la persona no hizo                 |
| `noindex` (metadata + cabecera `X-Robots-Tag`) y `robots.txt`           | Que el panel aparezca en buscadores            |

### Fichas de pacientes

Contienen datos de salud, que la ley chilena considera **datos sensibles**. Cada ficha tiene:
identificación (nombre, RUT, fecha de nacimiento, sexo), estadía (ingreso, habitación), salud
general (alergias, previsión, médico tratante), deterioro cognitivo (grado y detalle),
observaciones, contacto de emergencia y **medicamentos**:

- **Programados:** dosis, horas y días (por defecto todos; sirve para los semanales). La ficha
  los muestra ordenados por hora: «¿qué le toca a esta hora?».
- **Situacionales:** se dan solo ante una situación, que es obligatorio indicar (ej: «dolor o
  fiebre sobre 38 °C»). Se muestran aparte.

**Código QR:** en la ficha → «Código QR» → «Imprimir etiqueta». El QR lleva a
`/admin/p/<código>`: el código es aleatorio y **no contiene datos del paciente**. Al
escanearlo con la cámara del celular, si no hay sesión se pide ingresar (correo y contraseña)
y luego se abre esa ficha. Sin el rol `pacientes` o `pacientes_lectura`, no se ve nada. Si una
etiqueta se pierde, «Generar nuevo QR» deja inservible la anterior.

**Registro de dosis:** lo hacen ambos roles (los cuidadores son quienes dan los
medicamentos).

- En la ficha, **«Dosis de hoy»** muestra cada dosis programada del día con su estado:
  «Toca ahora» (hasta 1 hora antes o después), «Atrasada» (más de 1 hora tarde), «Más tarde»
  o ya registrada. «Dada» se registra con un toque; «No se dio» pide el motivo (rechazó,
  dormido, ausente, sin medicamento, indicación médica u otro).
- **Situacionales:** «Registrar dosis», con la situación que la motivó; se ve cuándo fue la
  última.
- **Ronda** (`/admin/pacientes/ronda`, botón en «Pacientes»): las dosis de todos los residentes
  por hora, con las atrasadas primero. El inicio del panel resume las atrasadas del día.
- Pasada la medianoche, las dosis de las últimas 6 horas siguen a la vista, para el turno de
  noche.
- **«Registro de dosis»** en la ficha: últimos 14 días. Los registros no se editan ni se borran:
  si hubo un error, se **anulan** con su motivo y quedan a la vista. Puede anularlos quien los
  hizo o el rol `pacientes`.

| Capa                                                                        | Protege contra                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------- |
| RLS: ver con `pacientes` o `pacientes_lectura`; editar solo con `pacientes` | Acceso o cambios de quien no corresponde           |
| Historial (auditoría) de consultas y cambios, con el valor anterior         | Cambios sin rastro (ej: una dosis modificada)      |
| El historial lo escribe la base de datos; nadie puede editarlo ni borrarlo  | Borrar las huellas                                 |
| Las fichas no se borran: se egresan (y se pueden reingresar)                | Pérdida de información                             |
| QR con código aleatorio, sin datos, y regenerable                           | Filtración por una etiqueta fotografiada o perdida |
| Nombre del paciente fuera del título de la pestaña                          | Que quede en el historial del navegador            |
| Checks en la base (RUT, teléfono, horas, días, motivo de los situacionales) | Datos mal formados                                 |
| Dosis: la base fija quién y cuándo; una dosis se registra una sola vez      | Registros falsos o duplicados                      |
| Dosis: solo de hoy o de anoche, y a lo más 2 horas antes de su hora         | Registrar dosis que aún no se dan                  |
| Dosis: no se editan ni se borran; se anulan con motivo                      | Borrar un error sin dejar rastro                   |
| Quitar un medicamento no borra sus dosis registradas                        | Pérdida del historial de administración            |

Antes de cargar fichas reales, revisa con el abogado el consentimiento del residente o su
representante y el plazo de conservación (ver el [checklist](#9-checklist-de-seguridad-antes-de-publicar)).

### Agregar un módulo (agenda, inventario, …)

Crear su página en `src/app/(admin)/admin/(panel)/<ruta>/page.tsx`, llamar a
`requerirRol("pacientes")` (o el rol que corresponda) en ella y en sus servicios, proteger sus
tablas con `tiene_rol(...)` en RLS, y cambiar `disponible: true` en
[`src/config/admin.ts`](src/config/admin.ts).

## 6. Dónde editar los textos del sitio

**Desde el panel, en `/admin/sitio`** (rol `sitio`), sin volver a desplegar: nombre y
descripción, WhatsApp y su mensaje, teléfono, correos, dirección, horario de visitas, mapa,
portada, «Quiénes somos», fotos, servicios, «Por qué elegirnos», testimonios, preguntas
frecuentes y datos de la política de privacidad. El índice del módulo muestra qué datos
faltan.

- Las secciones **sin contenido no se muestran** (sin fotos no hay galería, sin testimonios
  no hay sección de testimonios, etc.), y los botones de contacto sin número tampoco.
- **Horario de visitas:** se ingresa por tramos (días + desde/hasta, hasta 3 tramos; ej:
  «Lunes a viernes, de 10:00 a 18:00»). Así se muestra en el sitio y Google lo entiende. La
  «Aclaración» (texto libre) aparece debajo, para excepciones como festivos.
- Las páginas públicas son **estáticas** (rápidas): al guardar en el panel se regeneran solas
  en la siguiente visita (y, como respaldo, cada hora). Lo mismo el título, la descripción y
  la imagen para compartir.
- Las **fotos** se reducen en el navegador (máx. 1600 px, WebP) antes de subirse, lo que
  además les quita los metadatos con la ubicación GPS. Se guardan en el bucket `sitio` de
  Supabase Storage: cualquiera puede verlas por su URL, pero solo el rol `sitio` puede subir
  o borrar, y nadie puede listar el bucket.
- En el código solo quedan textos fijos de la interfaz (títulos de secciones, botones y
  opciones del formulario): [`src/config/site.ts`](src/config/site.ts). Los textos del texto
  legal base están en [`src/app/(publico)/privacidad/page.tsx`](<src/app/(publico)/privacidad/page.tsx>).

## 7. SEO

Todo se arma con el contenido del panel; no hay datos del negocio escritos en el código.

| Qué                                                                                  | Dónde                                                                                     |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Título «Nombre \| Hogar de reposo en [ciudad]», descripción (la «Descripción breve») | [`src/lib/seo.ts`](src/lib/seo.ts), [`src/app/layout.tsx`](src/app/layout.tsx)            |
| Open Graph y Twitter: vista previa al compartir en WhatsApp y redes                  | Imagen generada con nombre, descripción y ciudad: `src/app/(publico)/opengraph-image.tsx` |
| URL canónica por página (evita duplicados con la URL de Vercel)                      | `alternates.canonical` en cada página                                                     |
| Datos estructurados JSON-LD `LocalBusiness`: dirección, teléfono, correo y horario   | `datosEstructuradosNegocio()` en `src/lib/seo.ts`                                         |
| `/sitemap.xml` y `/robots.txt` (bloquea `/admin` y `/api/`)                          | `src/app/sitemap.ts`, `src/app/robots.ts`                                                 |
| Favicon (`icon.svg`) e ícono para iPhone (`apple-icon`)                              | `src/app/`                                                                                |

Para que Google muestre bien el sitio: completa en el panel la **descripción breve**, la
**ciudad**, la **dirección**, el **teléfono** y el **horario por tramos**, y sigue
[4.8](#48-google-search-console-y-ficha-del-negocio).

## 8. Formulario de contacto: capas de seguridad

Flujo: formulario → Server Action → Zod → honeypot → Turnstile → rate limit → `crear_lead`
→ correo con Resend (se envía después de responder; si falla, el contacto igual queda
guardado).

| Capa                           | Protege contra                                                         |
| ------------------------------ | ---------------------------------------------------------------------- |
| Validación Zod (cliente)       | Errores de tipeo; respuesta inmediata a la persona                     |
| Validación Zod (servidor)      | Datos manipulados: el servidor es la fuente de verdad                  |
| Honeypot (`sitio_web`)         | Bots simples (se les responde "éxito" sin guardar nada)                |
| Cloudflare Turnstile           | Bots avanzados (el token se verifica en el servidor)                   |
| Rate limit (5 por hora por IP) | Abuso desde una misma conexión (IP guardada solo como hash HMAC)       |
| Secreto compartido en Vault    | Crear leads llamando directo a la API de Supabase con la clave pública |
| Restricciones SQL + RLS        | Datos fuera de formato; lectura/edición por quien no es admin          |

Además, en todo el sitio: cabeceras de seguridad (CSP, HSTS, `X-Frame-Options`,
`nosniff`, `Referrer-Policy`, `Permissions-Policy`) definidas en
[`next.config.ts`](next.config.ts).

## 9. Checklist de seguridad antes de publicar

**Base de datos (Supabase)**

- [ ] `pnpm db:test` pasa en local (RLS y privilegios).
- [ ] RLS activo en **todas** las tablas de producción. En el SQL Editor, esta consulta debe
      devolver **0 filas**:
  ```sql
  select c.relname as tabla_sin_rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and n.nspname = 'public' and not c.relrowsecurity;
  ```
- [ ] Advisors → **Security Advisor** sin errores.
- [ ] `pnpm exec supabase migration list`: local y remoto coinciden.
- [ ] El seed **no** está en producción: `select email from auth.users;` no muestra
      `admin@example.com`.
- [ ] El secreto `formulario_secreto` existe en Vault y coincide con
      `SUPABASE_FORMULARIO_SECRETO` (enviar el formulario de prueba lo confirma).

**Auth y panel**

- [ ] Registro público deshabilitado; proveedor Email activo; mínimo 8 caracteres (4.4).
- [ ] Site URL = dominio definitivo; plantilla **Reset Password** reemplazada; aviso
      **Password changed** activo; SMTP de Resend configurado.
- [ ] Probado en producción: ingresar, «¿Olvidaste tu contraseña?», y `/admin` sin sesión
      redirige al login.
- [ ] Cada administrador tiene solo los roles que necesita y su propia cuenta (nunca
      compartidas): los cuidadores, `pacientes_lectura` (ven fichas y registran dosis).
- [ ] El rol `usuarios` lo tienen solo quienes administran el sistema (idealmente dos
      personas, por si una no está). Revisa en `/admin/usuarios` que no queden cuentas
      activas de personas que ya no trabajan en el hogar.

**Claves y variables**

- [ ] En Vercel solo hay claves **publicables** en variables `NEXT_PUBLIC_*`; no existe
      `SUPABASE_SERVICE_ROLE_KEY` ni ninguna `sb_secret_...`.
- [ ] `RATE_LIMIT_SALT` y `SUPABASE_FORMULARIO_SECRETO` generados para producción (no los de
      `.env.example`), distintos entre sí y marcados como Sensitive.
- [ ] Turnstile con claves **reales** (no las de prueba `1x000…`), activo en el sitio y en
      Supabase — o desactivado a conciencia en ambos.
- [ ] `.env.local` y `.env.production.local` nunca se suben al repositorio (están en
      `.gitignore`).

**Dominio y correo**

- [ ] `https://dominio.cl` carga con candado y responde con `Strict-Transport-Security`
      (`curl -I https://dominio.cl`).
- [ ] Dominio verificado en Resend; el remitente del panel usa ese dominio; el aviso de un
      contacto de prueba llega (revisar también spam).

**Contenido y legal**

- [ ] La política de privacidad fue **revisada por un abogado** (Ley 19.628 y Ley 21.719) y
      sus datos están completos en el panel. Tras la revisión, quitar el aviso de borrador en
      `src/app/(publico)/privacidad/page.tsx`.
- [ ] Testimonios reales y con autorización de quien los entregó.
- [ ] Fichas de pacientes: el abogado revisó el consentimiento del residente (o su
      representante) para tratar sus datos de salud y el plazo de conservación de las
      fichas; la política de privacidad lo menciona.

**Cuentas y continuidad**

- [ ] Verificación en dos pasos activa en GitHub, Vercel, Supabase, Resend, Cloudflare y
      NIC Chile.
- [ ] Respaldos: revisa en Supabase → Database → Backups qué incluye tu plan. Con datos
      personales, conviene el plan Pro (respaldos diarios); el plan gratuito además pausa el
      proyecto tras una semana sin actividad.

## 10. Actualizar producción cuando cambia el código

1. Si hay migraciones nuevas en `supabase/migrations/`, aplícalas **antes** de desplegar:
   `pnpm db:push` (el código nuevo puede necesitar las columnas nuevas).
2. Si el cambio lo indica, ajusta la configuración del Dashboard de Supabase (plantillas,
   Auth) o las variables de Vercel.
3. Commit y push a `master`: GitHub Actions revisa el código y Vercel despliega.
