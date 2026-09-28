# [NOMBRE DEL HOGAR] — Sitio web

Landing page y panel de administración de un hogar de reposo para adultos mayores.
Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · Docker.

> Documentación inicial (etapa 1). La guía completa de despliegue, Supabase, Resend,
> Vercel y dominio se agrega en la etapa 6.

## Requisitos

- Node.js 24 LTS (mínimo 22.12). Ver `.nvmrc`.
- pnpm vía corepack: `corepack enable pnpm` (la versión se toma de `packageManager`).
  En Windows, si Node está instalado en `C:\Program Files`, ese comando requiere una
  terminal **como administrador**. Alternativa sin permisos: anteponer `corepack` a cada
  comando (`corepack pnpm dev`, `corepack pnpm db:start`, etc.).
- Docker Desktop (o Docker Engine + Compose v2).
- La CLI de Supabase viene como dependencia de desarrollo: `pnpm exec supabase ...`.
  Supabase local necesita Docker en ejecución.

## Desarrollo local sin Docker (recomendado para el día a día)

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local   # completar valores
pnpm dev                     # http://localhost:3000
```

**El sitio web está en http://localhost:3000** (se detiene con Ctrl+C). `supabase start` no lo
inicia: los puertos 5432x son solo de Supabase (ver la tabla de abajo). El formulario de
contacto necesita Supabase local en ejecución.

## Base de datos local (Supabase)

Requiere Docker en ejecución. La primera vez descarga varias imágenes (unos minutos).

```bash
pnpm db:start     # levanta Supabase local, aplica migraciones y seed.sql
pnpm db:test      # verifica las políticas de seguridad (deben pasar todos los tests)
```

| Servicio                         | URL                    | Para qué sirve                                                                                                         |
| -------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| API (`NEXT_PUBLIC_SUPABASE_URL`) | http://127.0.0.1:54321 | La usa la app, no el navegador. Es normal que la raíz responda `no Route matched`: solo atiende rutas como `/rest/v1`. |
| Studio (panel visual)            | http://127.0.0.1:54323 | Ver y editar datos (ej: Table Editor → `leads`).                                                                       |
| Mailpit (correos capturados)     | http://127.0.0.1:54324 | Correos que Supabase Auth enviaría en local. Los avisos del formulario van por Resend, no aparecen aquí.               |

- La _Publishable key_ local es fija y ya viene en `.env.example`.
- `supabase/seed.sql` carga contactos ficticios y un administrador de prueba
  (`admin@example.com`). Nunca se aplica en producción.
- **Cambios de esquema:** crear una migración con `pnpm exec supabase migration new <nombre>`,
  escribir el SQL, aplicar con `pnpm db:reset` y regenerar los tipos con `pnpm db:types`.
  Toda tabla nueva debe tener RLS habilitado (el test `db:test` falla si no).

## Desarrollo local con Docker

```bash
cp .env.example .env.local
pnpm docker:dev              # docker compose up --build
```

El código se monta como volumen, por lo que los cambios se recargan en caliente
(en unos 3 segundos).

> **Por qué el contenedor usa webpack y polling:** Docker Desktop en Windows y macOS no
> propaga los eventos de cambio de archivos a través de los bind mounts. Por eso el
> contenedor revisa los archivos periódicamente (`WATCHPACK_POLLING=true`), lo que consume
> algo más de CPU. Turbopack no detectó cambios sobre un mount de Windows ni siquiera con
> polling (probado con Next 16.3), así que dentro de Docker se usa `next dev --webpack`.
> Con `pnpm dev` fuera de Docker se sigue usando Turbopack, que es más rápido. Para mejorar
> el rendimiento en Windows, clona el repositorio dentro de WSL 2 (`/home/usuario/...`).

### Conectar la app en Docker con Supabase local

Supabase local se levanta con su CLI, que crea sus propios contenedores (no se replica
en `docker-compose.yml`):

```bash
pnpm db:start        # supabase start
pnpm exec supabase status   # muestra API URL y Publishable key
```

El problema: hay **dos clientes** que deben llegar a Supabase.

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

## Variables de entorno: build vs runtime

Todas están documentadas en [`.env.example`](.env.example) y se validan con Zod en
[`src/lib/env.ts`](src/lib/env.ts).

| Tipo                   | Variables                                                                                                                                                     | Cuándo se definen                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Build** (públicas)   | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TURNSTILE_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Al ejecutar `next build`. En Docker, como `--build-arg`. Cambiarlas exige reconstruir. |
| **Runtime** (secretas) | `RATE_LIMIT_SALT`, `SUPABASE_FORMULARIO_SECRETO`; opcionales: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `SUPABASE_INTERNAL_URL`                               | Al iniciar el servidor. En Docker, con `--env-file` o `-e`.                            |

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

- `NEXT_PUBLIC_SITE_URL` admite el dominio sin protocolo (`dominio.cl` → `https://dominio.cl`).
  En Vercel puede omitirse: se usa el dominio de producción del proyecto.
- **CAPTCHA opcional:** `NEXT_PUBLIC_TURNSTILE_ENABLED="false"` desactiva Turnstile en el
  formulario de contacto y en el login del panel; entonces `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y
  `TURNSTILE_SECRET_KEY` pueden omitirse. Por defecto está **activo**. Siguen protegiendo el
  honeypot, el rate limit y el secreto del formulario, pero conviene activarlo antes de
  publicar definitivamente (el servidor lo recuerda en los logs al arrancar). Si se desactiva
  aquí, también debe estar desactivado en Supabase (Authentication → CAPTCHA), o el login
  del panel será rechazado.

## Formulario de contacto: capas de seguridad

Flujo: formulario → Server Action → Zod → honeypot → Turnstile → rate limit → `crear_lead`
→ correo con Resend (se envía después de responder; si falla, el lead igual queda guardado).

| Capa                           | Protege contra                                                         |
| ------------------------------ | ---------------------------------------------------------------------- |
| Validación Zod (cliente)       | Errores de tipeo; respuesta inmediata a la persona                     |
| Validación Zod (servidor)      | Datos manipulados: el servidor es la fuente de verdad                  |
| Honeypot (`sitio_web`)         | Bots simples (se les responde "éxito" sin guardar nada)                |
| Cloudflare Turnstile           | Bots avanzados (el token se verifica en el servidor)                   |
| Rate limit (5 por hora por IP) | Abuso desde una misma conexión (IP guardada solo como hash HMAC)       |
| Secreto compartido en Vault    | Crear leads llamando directo a la API de Supabase con la clave pública |
| Restricciones SQL + RLS        | Datos fuera de formato; lectura/edición por quien no es admin          |

### Secreto del formulario en producción

Los leads solo se crean con la función `crear_lead()`, que exige un secreto guardado en
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
y actualizar la variable. Si el secreto falta o no coincide, el formulario deja de guardar
(falla de forma cerrada) y el servidor lo registra en los logs.

> **IP del visitante:** se toma de `x-real-ip` / `x-forwarded-for`. Vercel sobrescribe esas
> cabeceras, por lo que son confiables. En otro proveedor, verificar que su proxy también
> lo haga; de lo contrario el rate limit podría evadirse falsificando la cabecera.

## Panel de administración

| Ruta           | Contenido                                                          |
| -------------- | ------------------------------------------------------------------ |
| `/admin/login` | Ingreso con correo y contraseña                                    |
| `/admin`       | Inicio: resumen de contactos y módulos (actuales y futuros)        |
| `/admin/leads` | Contactos en tarjetas: filtro por estado, llamar, WhatsApp, correo |

### Entrar en local

`corepack pnpm dev`, abrir http://localhost:3000/admin e ingresar con el administrador de
prueba del seed: **`admin@example.com`** / **`admin-local-12345`** (solo existe en local).

### Capas de seguridad del acceso

| Capa                                                                  | Protege contra                      |
| --------------------------------------------------------------------- | ----------------------------------- |
| Registro público deshabilitado                                        | Que cualquiera cree una cuenta      |
| Contraseñas de 12 caracteres o más                                    | Contraseñas fáciles de adivinar     |
| Rate limit: 10 intentos por hora por IP                               | Probar contraseñas por fuerza bruta |
| CAPTCHA (Turnstile) opcional, verificado por Supabase                 | Intentos automatizados              |
| Mismo mensaje si el correo no existe o la contraseña es incorrecta    | Averiguar qué correos tienen cuenta |
| Rol en la tabla `admins`, verificado en cada página y acción, más RLS | Cuentas sin rol de administrador    |
| Cookie de sesión `httpOnly`                                           | Robo de la sesión mediante XSS      |
| `noindex` (metadata + cabecera `X-Robots-Tag`)                        | Que el panel aparezca en buscadores |

Para agregar un módulo (agenda, inventario, pacientes): crear su página en
`src/app/(admin)/admin/(panel)/<ruta>/page.tsx`, llamar a `requerirAdmin()` en ella y en sus
servicios, y cambiar `disponible: true` en [`src/config/admin.ts`](src/config/admin.ts).

### Crear un administrador (producción)

1. Supabase Dashboard → **Authentication → Users → Add user → Create new user**: correo,
   contraseña (12 caracteres o más) y marcar **Auto Confirm User**.
2. SQL Editor:
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'persona@dominio.cl';
   ```

Crear el usuario no basta: sin la fila en `admins`, el login responde "Esta cuenta no tiene
acceso al panel". Para quitar el acceso: `delete from public.admins where email = 'persona@dominio.cl';`
(y opcionalmente borrar el usuario en Authentication → Users).

### Cambiar la contraseña de un administrador

SQL Editor (Supabase guarda la contraseña cifrada con bcrypt):

```sql
update auth.users
set encrypted_password = extensions.crypt('<NUEVA_CONTRASEÑA>', extensions.gen_salt('bf'))
where email = 'persona@dominio.cl';
```

### Configurar Supabase Auth en producción

Los nombres de los menús del Dashboard pueden variar levemente entre versiones.

1. **Registro público:** Authentication → Sign In / Providers → desactivar **Allow new users
   to sign up**. Mantener habilitado el proveedor **Email** (lo usa el ingreso con contraseña).
2. **Largo mínimo de contraseña:** en el proveedor Email, **Minimum password length** = `12`.
   Opcional (plan Pro): activar **Prevent use of leaked passwords**.
3. **CAPTCHA** (cuando se active Turnstile en el sitio): Authentication → Attack Protection →
   activar **CAPTCHA protection**, proveedor **Cloudflare Turnstile**, con la **misma clave
   secreta** que `TURNSTILE_SECRET_KEY` (el par de `NEXT_PUBLIC_TURNSTILE_SITE_KEY`), y quitar
   `NEXT_PUBLIC_TURNSTILE_ENABLED="false"` en Vercel (requiere un nuevo deploy). Ambos lados
   deben coincidir: activo en los dos o desactivado en los dos.
4. Opcional (plan Pro): Authentication → Sessions → limitar la duración de las sesiones.

## Imagen Docker de producción

```bash
# 1. Crear .env.production.local con las variables de build (y de runtime).
# 2. Construir (lee .env.production.local y pasa las NEXT_PUBLIC_* como build args):
pnpm docker:build

# 3. Ejecutar (las secretas se entregan en runtime):
docker run --rm -p 3000:3000 --env-file .env.production.local hogar-web:latest
```

El contenedor escucha en `0.0.0.0` y respeta la variable `PORT` (3000 por defecto), como
requieren proveedores tipo Koyeb o Cloud Run. Incluye `HEALTHCHECK` contra `/api/health`
y se ejecuta con el usuario sin privilegios `node`.

## Scripts

| Script              | Descripción                                           |
| ------------------- | ----------------------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo                                |
| `pnpm build`        | Build de producción (salida `standalone`)             |
| `pnpm lint`         | ESLint                                                |
| `pnpm typecheck`    | Verificación de tipos con TypeScript                  |
| `pnpm format`       | Formatea con Prettier                                 |
| `pnpm db:start`     | Levanta Supabase local                                |
| `pnpm db:stop`      | Detiene Supabase local                                |
| `pnpm db:reset`     | Recrea la base local: migraciones + `seed.sql`        |
| `pnpm db:test`      | Tests de seguridad (RLS y privilegios) con pgTAP      |
| `pnpm db:migrate`   | Aplica migraciones pendientes a Supabase local        |
| `pnpm db:push`      | Aplica migraciones al proyecto remoto vinculado       |
| `pnpm db:types`     | Genera `src/types/database.ts` desde el esquema local |
| `pnpm docker:dev`   | Desarrollo en Docker con hot reload                   |
| `pnpm docker:build` | Construye la imagen de producción                     |

## Dónde editar los textos del sitio

Todos los datos del negocio están en [`src/config/site.ts`](src/config/site.ts). Los valores
entre corchetes (`[NOMBRE DEL HOGAR]`, etc.) son marcadores pendientes; en producción el
servidor avisa en los logs si queda alguno.
