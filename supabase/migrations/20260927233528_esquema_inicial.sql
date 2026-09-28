-- =============================================================================
-- Esquema inicial: leads (contactos), admins y rate limiting.
--
-- Principios:
--   * RLS habilitado en TODAS las tablas, sin excepción.
--   * Privilegios mínimos: se revocan los permisos por defecto que Supabase otorga
--     a los roles `anon` y `authenticated`, y se conceden solo los necesarios,
--     incluso a nivel de columna. RLS decide QUÉ FILAS; los GRANT, QUÉ OPERACIONES
--     y QUÉ COLUMNAS. Ambas capas deben permitir la acción.
--   * Funciones SECURITY DEFINER con `search_path` vacío (nombres calificados),
--     para evitar secuestro de funciones mediante objetos homónimos.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

-- Mantiene updated_at al día en cada UPDATE.
create function public.actualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- admins: usuarios de Supabase Auth autorizados a entrar al panel.
-- Se administra solo desde el SQL Editor / CLI (nunca desde la aplicación).
-- -----------------------------------------------------------------------------

create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null check (char_length(email) <= 254),
  created_at timestamptz not null default now()
);

comment on table public.admins is
  'Usuarios con acceso al panel de administración. Alta y baja solo vía SQL.';

alter table public.admins enable row level security;

revoke all on table public.admins from anon, authenticated;
grant select on table public.admins to authenticated;

-- Cada usuario solo puede ver SU propia fila (para saber si es administrador).
create policy "admins: lectura de la propia fila"
  on public.admins
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Sin políticas de INSERT/UPDATE/DELETE: la aplicación no puede modificar admins.


-- -----------------------------------------------------------------------------
-- is_admin(): ¿el usuario autenticado actual es administrador?
-- SECURITY DEFINER para consultar admins sin depender de sus políticas RLS
-- (evita recursión y permite usarla dentro de políticas de otras tablas).
-- -----------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins
    where user_id = (select auth.uid())
  );
$$;

comment on function public.is_admin() is
  'true si el usuario autenticado está en public.admins.';

-- Por defecto PostgreSQL permite ejecutar funciones a PUBLIC: se restringe.
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- -----------------------------------------------------------------------------
-- leads: solicitudes de contacto del formulario del sitio.
-- -----------------------------------------------------------------------------

create type public.estado_lead as enum ('nuevo', 'contactado', 'descartado');

create table public.leads (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null check (char_length(nombre) between 2 and 100),
  -- Formato normalizado E.164 chileno: +56 seguido de 9 dígitos (móvil o fijo).
  telefono             text not null check (telefono ~ '^\+56[0-9]{9}$'),
  email                text not null check (
                         char_length(email) <= 254
                         and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
                       ),
  parentesco           text check (parentesco is null or char_length(parentesco) <= 50),
  mensaje              text not null check (char_length(mensaje) between 10 and 2000),
  consentimiento       boolean not null,
  -- La fija la base de datos: el cliente no puede enviar este valor (ver GRANT).
  fecha_consentimiento timestamptz not null default now(),
  estado               public.estado_lead not null default 'nuevo',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Refuerzo a nivel de esquema: no puede existir un lead sin consentimiento.
  constraint leads_requiere_consentimiento check (consentimiento)
);

comment on table public.leads is
  'Contactos del formulario del sitio. Contiene datos personales.';

-- Listado del panel: filtro por estado y orden por fecha.
create index leads_estado_created_at_idx on public.leads (estado, created_at desc);

create trigger leads_actualizar_updated_at
  before update on public.leads
  for each row
  execute function public.actualizar_updated_at();

alter table public.leads enable row level security;

revoke all on table public.leads from anon, authenticated;

-- INSERT solo de las columnas del formulario. id, estado, fecha_consentimiento,
-- created_at y updated_at quedan siempre con los valores por defecto de la base.
-- También `authenticated`: un administrador con sesión abierta podría usar el formulario.
grant insert (nombre, telefono, email, parentesco, mensaje, consentimiento)
  on table public.leads to anon, authenticated;

-- Lectura y cambio de estado: el GRANT habilita la operación, RLS la limita a admins.
-- UPDATE solo de la columna `estado`.
grant select on table public.leads to authenticated;
grant update (estado) on table public.leads to authenticated;

create policy "leads: cualquiera puede crear con consentimiento"
  on public.leads
  for insert
  to anon, authenticated
  with check (consentimiento = true);

create policy "leads: admins pueden leer"
  on public.leads
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "leads: admins pueden actualizar"
  on public.leads
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Sin política de DELETE: nadie puede borrar leads desde la aplicación.


-- -----------------------------------------------------------------------------
-- rate_limits: límite de envíos persistente (la memoria del servidor no sirve en
-- entornos serverless, donde cada invocación puede ser una instancia distinta).
-- Guarda un HASH de la IP (HMAC con sal secreta calculado en el servidor),
-- nunca la IP en texto plano.
-- -----------------------------------------------------------------------------

create table public.rate_limits (
  ip_hash        text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  accion         text not null check (char_length(accion) <= 50),
  contador       integer not null default 1 check (contador > 0),
  ventana_inicio timestamptz not null default now(),
  primary key (ip_hash, accion)
);

comment on table public.rate_limits is
  'Contadores de rate limiting por hash de IP. Solo accesible vía verificar_rate_limit().';

-- Para la limpieza periódica de ventanas vencidas.
create index rate_limits_ventana_inicio_idx on public.rate_limits (ventana_inicio);

alter table public.rate_limits enable row level security;

-- Sin políticas y sin privilegios: ningún rol de la aplicación accede directamente.
revoke all on table public.rate_limits from anon, authenticated;


-- -----------------------------------------------------------------------------
-- verificar_rate_limit(): registra un intento y devuelve si está permitido.
--
-- Los límites se definen AQUÍ (no se reciben como parámetro) para que nadie pueda
-- invocar la función con un límite a su conveniencia. Operación atómica
-- (INSERT ... ON CONFLICT), segura ante envíos concurrentes.
-- Ventana fija que comienza en el primer intento: al vencer, el contador se reinicia.
-- -----------------------------------------------------------------------------

create function public.verificar_rate_limit(p_ip_hash text, p_accion text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limite   integer;
  v_ventana  interval;
  v_contador integer;
begin
  case p_accion
    when 'contacto' then
      v_limite  := 5;
      v_ventana := interval '1 hour';
    else
      raise exception 'Acción de rate limit no válida' using errcode = '22023';
  end case;

  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Hash de IP no válido' using errcode = '22023';
  end if;

  insert into public.rate_limits as rl (ip_hash, accion, contador, ventana_inicio)
  values (p_ip_hash, p_accion, 1, now())
  on conflict (ip_hash, accion) do update
    set contador = case
                     when rl.ventana_inicio <= now() - v_ventana then 1
                     else rl.contador + 1
                   end,
        ventana_inicio = case
                           when rl.ventana_inicio <= now() - v_ventana then now()
                           else rl.ventana_inicio
                         end
  returning contador into v_contador;

  -- Limpieza oportunista: la tabla no crece indefinidamente ni conserva hashes
  -- más tiempo del necesario (minimización de datos).
  delete from public.rate_limits
  where ventana_inicio < now() - interval '1 day';

  return v_contador <= v_limite;
end;
$$;

comment on function public.verificar_rate_limit(text, text) is
  'Registra un intento para (hash de IP, acción) y devuelve true si está dentro del límite.';

revoke execute on function public.verificar_rate_limit(text, text) from public;
grant execute on function public.verificar_rate_limit(text, text) to anon, authenticated;

-- La función de trigger no debe poder invocarse vía API.
revoke execute on function public.actualizar_updated_at() from public, anon, authenticated;
