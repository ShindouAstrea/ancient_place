-- =============================================================================
-- Gestión de usuarios desde el panel (/admin/usuarios), con el rol "usuarios".
--
-- Hasta ahora cada cuenta se creaba a mano (Dashboard de Supabase + SQL). Con este rol se
-- puede, desde el panel: crear cuentas, asignar roles, desactivarlas y reactivarlas, y
-- darles una contraseña temporal.
--
-- Sin service_role key (el proyecto no la usa a propósito: si se filtrara, daría acceso a
-- todos los datos, incluidas las fichas de salud). Cada operación es una función SECURITY
-- DEFINER que exige el rol "usuarios" en la propia base de datos, y escribe en auth.users
-- igual que supabase/seed.sql.
--
-- Capas:
--   - Las cuentas no se borran: se desactivan (el historial de las fichas sigue diciendo
--     quién hizo cada cosa). Desactivar cierra sus sesiones en todos los dispositivos y
--     bloquea el ingreso también en Supabase Auth (banned_until).
--   - Contraseña temporal: mientras la persona no la cambie, la base de datos no le
--     reconoce ningún rol (RLS no le muestra datos) y el panel la lleva a cambiarla.
--   - Nadie puede desactivarse, quitarse el rol "usuarios" ni ponerse una contraseña
--     temporal: siempre queda al menos una persona que administra usuarios.
--   - Cada cambio queda en auditoria_usuarios (quién, a qué cuenta, qué y cuándo). Nadie
--     puede modificarla desde la aplicación, y nunca contiene contraseñas.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. DATOS DE CADA CUENTA
-- -----------------------------------------------------------------------------

alter table public.admins
  add column nombre text not null default '' check (char_length(nombre) <= 100),
  -- false = desactivada: no entra al panel ni a Supabase Auth, pero se conserva.
  add column activo boolean not null default true;

comment on table public.admins is
  'Cuentas del panel. Se administran desde /admin/usuarios (rol usuarios); no se borran: se desactivan.';
comment on table public.admin_roles is
  'Roles de cada cuenta. Se asignan desde /admin/usuarios (rol usuarios).';

-- Contraseñas temporales pendientes de cambio. En el esquema privado: la API no lo expone.
-- Guarda una HUELLA (SHA-256) del hash de la contraseña, no la contraseña ni su hash:
-- cuando la persona la cambia, el hash de auth.users deja de coincidir con la huella.
create table privado.contrasenas_temporales (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  huella    text not null check (huella ~ '^[0-9a-f]{64}$'),
  creada_en timestamptz not null default now()
);

alter table privado.contrasenas_temporales enable row level security;
revoke all on table privado.contrasenas_temporales from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. FUNCIONES INTERNAS (esquema privado: no se pueden llamar desde la API)
-- -----------------------------------------------------------------------------

create function privado.huella_contrasena(p_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select encode(sha256(convert_to(coalesce(encrypted_password, ''), 'UTF8')), 'hex')
    from auth.users
   where id = p_user_id;
$$;

-- true si la cuenta todavía usa la contraseña temporal que se le asignó.
create function privado.tiene_contrasena_temporal(p_user_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
      from privado.contrasenas_temporales
     where user_id = p_user_id
       and huella = privado.huella_contrasena(p_user_id)
  );
$$;

create function privado.marcar_contrasena_temporal(p_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  insert into privado.contrasenas_temporales (user_id, huella)
  values (p_user_id, privado.huella_contrasena(p_user_id))
  on conflict (user_id) do update
    set huella = excluded.huella,
        creada_en = now();
$$;

-- Cierra las sesiones de la cuenta en todos sus dispositivos (sus refresh tokens se
-- borran en cascada). El panel verifica la sesión contra Supabase Auth en cada página.
create function privado.cerrar_sesiones(p_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id;
$$;

create function privado.roles_de(p_user_id uuid)
returns public.rol_admin[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(rol order by rol), '{}')
    from public.admin_roles
   where user_id = p_user_id;
$$;

create function privado.exigir_rol_usuarios()
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.tiene_rol('usuarios') then
    raise exception 'Sin permiso para administrar usuarios' using errcode = '42501';
  end if;
end;
$$;

-- Los errores de validación usan códigos fijos que la aplicación traduce a mensajes.
create function privado.validar_cuenta(p_nombre text, p_roles public.rol_admin[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_nombre is null or char_length(trim(p_nombre)) not between 1 and 100 then
    raise exception 'nombre_invalido' using errcode = '22023';
  end if;
  if p_roles is null or cardinality(p_roles) = 0 or array_position(p_roles, null) is not null then
    raise exception 'roles_invalidos' using errcode = '22023';
  end if;
end;
$$;

-- Mismo mínimo que Supabase Auth (config.toml); 72 bytes es el máximo de bcrypt.
create function privado.validar_contrasena(p_contrasena text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_contrasena is null or char_length(p_contrasena) < 12 or octet_length(p_contrasena) > 72 then
    raise exception 'contrasena_invalida' using errcode = '22023';
  end if;
end;
$$;

-- Bloquea la cuenta en una fila para el resto de la operación y aplica las reglas comunes.
-- Devuelve si está activa.
create function privado.cuenta_para_modificar(p_user_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_activo boolean;
begin
  select activo into v_activo from public.admins where user_id = p_user_id for update;
  if not found then
    raise exception 'cuenta_inexistente' using errcode = 'P0002';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'propia_cuenta' using errcode = 'P0001';
  end if;
  return v_activo;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. AUDITORÍA
-- -----------------------------------------------------------------------------

create table public.auditoria_usuarios (
  id            bigint generated always as identity primary key,
  fecha         timestamptz not null default now(),
  -- Quién hizo el cambio (null si se hizo directo por SQL).
  usuario_id    uuid,
  usuario_email text,
  -- A qué cuenta. Sin llave foránea: el registro se conserva aunque la cuenta se borre por SQL.
  cuenta_id     uuid not null,
  cuenta_email  text not null,
  accion        text not null check (
                  accion in ('creacion', 'edicion', 'desactivacion', 'reactivacion', 'contrasena_temporal')
                ),
  -- Creación y edición: nombre y roles (en una edición, solo lo que cambió). Nunca contraseñas.
  antes         jsonb,
  despues       jsonb
);

comment on table public.auditoria_usuarios is
  'Quién creó, modificó, desactivó o dio contraseña temporal a cada cuenta. Solo la escriben funciones.';

create index auditoria_usuarios_por_cuenta on public.auditoria_usuarios (cuenta_id, fecha desc);

create function privado.auditar_usuario(
  p_cuenta_id uuid,
  p_accion text,
  p_antes jsonb default null,
  p_despues jsonb default null
)
returns void
language sql
set search_path = ''
as $$
  insert into public.auditoria_usuarios
    (usuario_id, usuario_email, cuenta_id, cuenta_email, accion, antes, despues)
  select (select auth.uid()), (select auth.jwt() ->> 'email'), a.user_id, a.email, p_accion,
         p_antes, p_despues
    from public.admins a
   where a.user_id = p_cuenta_id;
$$;

alter table public.auditoria_usuarios enable row level security;
revoke all on table public.auditoria_usuarios from anon, authenticated;
grant select on table public.auditoria_usuarios to authenticated;

create policy "auditoria_usuarios: ver con rol usuarios"
  on public.auditoria_usuarios for select to authenticated
  using ((select public.tiene_rol('usuarios')));


-- -----------------------------------------------------------------------------
-- 4. PERMISOS: cuentas desactivadas y contraseñas temporales
-- (create or replace conserva los permisos de ejecución existentes)
-- -----------------------------------------------------------------------------

-- Una cuenta desactivada deja de ser administradora (no entra al panel).
create or replace function public.is_admin()
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
       and activo
  );
$$;

-- Sin roles mientras la cuenta esté desactivada o use una contraseña temporal: todas las
-- políticas RLS que dependen de un rol dejan de mostrarle datos.
create or replace function public.tiene_rol(p_rol public.rol_admin)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.admin_roles r
      join public.admins a on a.user_id = r.user_id
     where r.user_id = (select auth.uid())
       and r.rol = p_rol
       and a.activo
  )
  and not privado.tiene_contrasena_temporal((select auth.uid()));
$$;

-- Datos de la sesión actual para el panel, en una sola consulta: nada si la cuenta no es
-- administradora o está desactivada.
create function public.mi_cuenta()
returns table (nombre text, roles public.rol_admin[], contrasena_temporal boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select a.nombre, privado.roles_de(a.user_id), privado.tiene_contrasena_temporal(a.user_id)
    from public.admins a
   where a.user_id = (select auth.uid())
     and a.activo;
$$;


-- -----------------------------------------------------------------------------
-- 5. GESTIÓN DE USUARIOS (rol "usuarios")
-- -----------------------------------------------------------------------------

create function public.listar_usuarios()
returns table (
  user_id             uuid,
  email               text,
  nombre              text,
  activo              boolean,
  roles               public.rol_admin[],
  creado_en           timestamptz,
  ultimo_ingreso      timestamptz,
  contrasena_temporal boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_rol_usuarios();
  return query
    select a.user_id, a.email, a.nombre, a.activo, privado.roles_de(a.user_id), a.created_at,
           u.last_sign_in_at, privado.tiene_contrasena_temporal(a.user_id)
      from public.admins a
      left join auth.users u on u.id = a.user_id
     order by a.activo desc, lower(coalesce(nullif(a.nombre, ''), a.email));
end;
$$;

-- Crea la cuenta en Supabase Auth (confirmada, con la contraseña temporal) y en el panel.
create function public.crear_usuario(
  p_email text,
  p_nombre text,
  p_roles public.rol_admin[],
  p_contrasena text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id     uuid := gen_random_uuid();
  v_email  text := lower(trim(p_email));
  v_nombre text := trim(p_nombre);
  v_roles  public.rol_admin[];
begin
  perform privado.exigir_rol_usuarios();
  perform privado.validar_cuenta(p_nombre, p_roles);
  perform privado.validar_contrasena(p_contrasena);
  if v_email is null
     or char_length(v_email) > 254
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'correo_invalido' using errcode = '22023';
  end if;
  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'correo_existente' using errcode = '23505';
  end if;
  select array_agg(distinct r order by r) into v_roles from unnest(p_roles) as r;

  -- Mismas columnas que completa Supabase Auth: los tokens van vacíos (no null), o Auth
  -- falla al leer la cuenta. bcrypt con costo 10, el mismo de Supabase Auth.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_contrasena, extensions.gen_salt('bf', 10)), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    user_id, provider_id, provider, identity_data, created_at, updated_at
  ) values (
    v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    now(), now()
  );

  insert into public.admins (user_id, email, nombre) values (v_id, v_email, v_nombre);
  insert into public.admin_roles (user_id, rol) select v_id, r from unnest(v_roles) as r;
  perform privado.marcar_contrasena_temporal(v_id);
  perform privado.auditar_usuario(
    v_id, 'creacion', null, jsonb_build_object('nombre', v_nombre, 'roles', to_jsonb(v_roles))
  );
  return v_id;
end;
$$;

-- Nombre y roles. Nadie puede quitarse a sí mismo el rol "usuarios".
create function public.actualizar_usuario(
  p_user_id uuid,
  p_nombre text,
  p_roles public.rol_admin[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nombre       text := trim(p_nombre);
  v_roles        public.rol_admin[];
  v_nombre_antes text;
  v_roles_antes  public.rol_admin[];
  v_antes        jsonb := '{}';
  v_despues      jsonb := '{}';
begin
  perform privado.exigir_rol_usuarios();
  perform privado.validar_cuenta(p_nombre, p_roles);
  select array_agg(distinct r order by r) into v_roles from unnest(p_roles) as r;

  select nombre into v_nombre_antes from public.admins where user_id = p_user_id for update;
  if not found then
    raise exception 'cuenta_inexistente' using errcode = 'P0002';
  end if;
  if p_user_id = (select auth.uid()) and not ('usuarios' = any (v_roles)) then
    raise exception 'propia_cuenta' using errcode = 'P0001';
  end if;
  v_roles_antes := privado.roles_de(p_user_id);

  if v_nombre <> v_nombre_antes then
    update public.admins set nombre = v_nombre where user_id = p_user_id;
    v_antes := v_antes || jsonb_build_object('nombre', v_nombre_antes);
    v_despues := v_despues || jsonb_build_object('nombre', v_nombre);
  end if;

  if v_roles <> v_roles_antes then
    delete from public.admin_roles where user_id = p_user_id and not (rol = any (v_roles));
    insert into public.admin_roles (user_id, rol)
    select p_user_id, r from unnest(v_roles) as r
    on conflict do nothing;
    v_antes := v_antes || jsonb_build_object('roles', to_jsonb(v_roles_antes));
    v_despues := v_despues || jsonb_build_object('roles', to_jsonb(v_roles));
  end if;

  if v_despues <> '{}' then
    perform privado.auditar_usuario(p_user_id, 'edicion', v_antes, v_despues);
  end if;
end;
$$;

-- Desactivar (cierra sus sesiones y bloquea el ingreso) o reactivar. Nunca la propia cuenta.
create function public.cambiar_estado_usuario(p_user_id uuid, p_activo boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_rol_usuarios();
  if p_activo is null then
    raise exception 'estado_invalido' using errcode = '22023';
  end if;
  if privado.cuenta_para_modificar(p_user_id) = p_activo then
    return;  -- ya estaba así: nada que registrar
  end if;

  update public.admins set activo = p_activo where user_id = p_user_id;
  -- Bloqueo también en Supabase Auth: no puede iniciar sesión ni renovarla. Un plazo de
  -- 100 años en vez de 'infinity', que Supabase Auth no sabe leer.
  update auth.users
     set banned_until = case when p_activo then null else now() + interval '100 years' end
   where id = p_user_id;
  if not p_activo then
    perform privado.cerrar_sesiones(p_user_id);
  end if;

  perform privado.auditar_usuario(
    p_user_id, case when p_activo then 'reactivacion' else 'desactivacion' end
  );
end;
$$;

-- Nueva contraseña temporal (ej: la persona olvidó la suya). Cierra sus sesiones en todos
-- los dispositivos; al ingresar deberá elegir una nueva. Nunca para la propia cuenta.
create function public.asignar_contrasena_temporal(p_user_id uuid, p_contrasena text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform privado.exigir_rol_usuarios();
  perform privado.validar_contrasena(p_contrasena);
  if not privado.cuenta_para_modificar(p_user_id) then
    raise exception 'cuenta_desactivada' using errcode = 'P0001';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_contrasena, extensions.gen_salt('bf', 10)),
         updated_at = now()
   where id = p_user_id;
  perform privado.marcar_contrasena_temporal(p_user_id);
  perform privado.cerrar_sesiones(p_user_id);
  perform privado.auditar_usuario(p_user_id, 'contrasena_temporal');
end;
$$;


-- -----------------------------------------------------------------------------
-- 6. PRIVILEGIOS DE EJECUCIÓN
-- -----------------------------------------------------------------------------

revoke execute on function
  privado.huella_contrasena(uuid),
  privado.tiene_contrasena_temporal(uuid),
  privado.marcar_contrasena_temporal(uuid),
  privado.cerrar_sesiones(uuid),
  privado.roles_de(uuid),
  privado.exigir_rol_usuarios(),
  privado.validar_cuenta(text, public.rol_admin[]),
  privado.validar_contrasena(text),
  privado.cuenta_para_modificar(uuid),
  privado.auditar_usuario(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;

revoke execute on function
  public.mi_cuenta(),
  public.listar_usuarios(),
  public.crear_usuario(text, text, public.rol_admin[], text),
  public.actualizar_usuario(uuid, text, public.rol_admin[]),
  public.cambiar_estado_usuario(uuid, boolean),
  public.asignar_contrasena_temporal(uuid, text)
  from public, anon;

grant execute on function
  public.mi_cuenta(),
  public.listar_usuarios(),
  public.crear_usuario(text, text, public.rol_admin[], text),
  public.actualizar_usuario(uuid, text, public.rol_admin[]),
  public.cambiar_estado_usuario(uuid, boolean),
  public.asignar_contrasena_temporal(uuid, text)
  to authenticated;


-- -----------------------------------------------------------------------------
-- 7. PRIMERAS PERSONAS CON EL ROL "usuarios"
-- Quienes ya tenían acceso completo (roles "sitio" y "pacientes"). Si nadie cumple esa
-- condición, asignarlo por SQL (ver README, «Crear el primer administrador»).
-- -----------------------------------------------------------------------------

insert into public.admin_roles (user_id, rol)
select user_id, 'usuarios'
  from public.admin_roles
 where rol in ('sitio', 'pacientes')
 group by user_id
having count(*) = 2;
