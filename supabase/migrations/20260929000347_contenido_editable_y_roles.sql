-- =============================================================================
-- Sitio autoadministrable + roles del panel.
--
-- 1. Roles: "sitio" (contenido del sitio web y contactos) y "pacientes" (futuro
--    módulo de pacientes, con datos de salud). Una persona puede tener ambos.
-- 2. Contenido del sitio en la base de datos (antes en src/config/site.ts): se edita
--    desde el panel sin volver a desplegar.
-- 3. Bucket de Storage para las fotos del sitio.
--
-- Lectura pública del contenido (es lo que se muestra en el sitio); escritura solo
-- para el rol "sitio", exigido por RLS y no solo por la aplicación.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ROLES
-- -----------------------------------------------------------------------------
create type public.rol_admin as enum ('sitio', 'pacientes');

create table public.admin_roles (
  user_id    uuid not null references public.admins (user_id) on delete cascade,
  rol        public.rol_admin not null,
  created_at timestamptz not null default now(),
  primary key (user_id, rol)
);

comment on table public.admin_roles is
  'Roles de cada administrador. Alta y baja solo vía SQL (ver README).';

alter table public.admin_roles enable row level security;
revoke all on table public.admin_roles from anon, authenticated;
grant select on table public.admin_roles to authenticated;

create policy "admin_roles: lectura de los propios roles"
  on public.admin_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Los administradores que ya existen conservan el acceso completo: ambos roles.
insert into public.admin_roles (user_id, rol)
select a.user_id, r.rol
from public.admins a
cross join unnest(enum_range(null::public.rol_admin)) as r (rol);

-- ¿El usuario autenticado tiene este rol? (SECURITY DEFINER: se usa en políticas).
create function public.tiene_rol(p_rol public.rol_admin)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_roles
    where user_id = (select auth.uid())
      and rol = p_rol
  );
$$;

revoke execute on function public.tiene_rol(public.rol_admin) from public, anon;
grant execute on function public.tiene_rol(public.rol_admin) to authenticated;

-- Contactos (leads): ahora exigen el rol "sitio" (antes bastaba con ser administrador).
drop policy "leads: admins pueden leer" on public.leads;
drop policy "leads: admins pueden actualizar" on public.leads;

create policy "leads: rol sitio puede leer"
  on public.leads
  for select
  to authenticated
  using ((select public.tiene_rol('sitio')));

create policy "leads: rol sitio puede actualizar"
  on public.leads
  for update
  to authenticated
  using ((select public.tiene_rol('sitio')))
  with check ((select public.tiene_rol('sitio')));


-- -----------------------------------------------------------------------------
-- 2. CONTENIDO DEL SITIO
-- Convención: '' (texto vacío) = dato aún no configurado; el sitio oculta lo que falta.
-- -----------------------------------------------------------------------------

-- Datos generales: una sola fila (id = true).
create table public.configuracion_sitio (
  id                   boolean primary key default true check (id),
  nombre               text not null default '' check (char_length(nombre) <= 100),
  descripcion_corta    text not null default '' check (char_length(descripcion_corta) <= 300),
  -- Contacto
  whatsapp             text not null default '' check (whatsapp = '' or whatsapp ~ '^\+56[0-9]{9}$'),
  mensaje_whatsapp     text not null default '' check (char_length(mensaje_whatsapp) <= 500),
  telefono             text not null default '' check (telefono = '' or telefono ~ '^\+56[0-9]{9}$'),
  email_contacto       text not null default '' check (char_length(email_contacto) <= 254),
  -- Avisos por correo de nuevos contactos (Resend)
  email_notificaciones text not null default '' check (char_length(email_notificaciones) <= 254),
  email_remitente      text not null default '' check (char_length(email_remitente) <= 200),
  -- Ubicación y visitas
  direccion            text not null default '' check (char_length(direccion) <= 200),
  ciudad               text not null default '' check (char_length(ciudad) <= 100),
  region               text not null default '' check (char_length(region) <= 100),
  horario_visitas      text not null default '' check (char_length(horario_visitas) <= 300),
  maps_embed_url       text not null default '' check (
                         maps_embed_url = '' or maps_embed_url ~ '^https://www\.google\.com/maps/embed\?'
                       ),
  maps_url             text not null default '' check (
                         maps_url = '' or (maps_url ~ '^https://' and char_length(maps_url) <= 500)
                       ),
  -- Portada y textos de secciones
  hero_titulo          text not null default '' check (char_length(hero_titulo) <= 150),
  hero_subtitulo       text not null default '' check (char_length(hero_subtitulo) <= 300),
  hero_foto            text check (hero_foto is null or hero_foto ~ '^portada/[0-9a-f-]{36}\.(webp|jpg|png)$'),
  hero_foto_ancho      integer check (hero_foto_ancho between 1 and 10000),
  hero_foto_alto       integer check (hero_foto_alto between 1 and 10000),
  hero_foto_alt        text not null default '' check (char_length(hero_foto_alt) <= 200),
  nosotros_texto       text not null default '' check (char_length(nosotros_texto) <= 3000),
  -- Datos destacados de "Quiénes somos": [{"valor": "15", "etiqueta": "años de experiencia"}]
  destacados           jsonb not null default '[]' check (
                         jsonb_typeof(destacados) = 'array' and jsonb_array_length(destacados) <= 4
                       ),
  servicios_intro      text not null default '' check (char_length(servicios_intro) <= 300),
  instalaciones_intro  text not null default '' check (char_length(instalaciones_intro) <= 300),
  -- Política de privacidad
  razon_social         text not null default '' check (char_length(razon_social) <= 150),
  rut                  text not null default '' check (char_length(rut) <= 20),
  email_privacidad     text not null default '' check (char_length(email_privacidad) <= 254),
  plazo_conservacion   text not null default '' check (char_length(plazo_conservacion) <= 200),
  plazo_respuesta      text not null default '' check (char_length(plazo_respuesta) <= 200),
  fecha_privacidad     text not null default '' check (char_length(fecha_privacidad) <= 50),
  updated_at           timestamptz not null default now()
);

comment on table public.configuracion_sitio is
  'Datos generales del sitio (fila única). Se editan desde el panel (rol sitio).';

-- Fila inicial: textos genéricos del diseño; los datos del negocio quedan vacíos.
insert into public.configuracion_sitio (
  nombre, descripcion_corta, mensaje_whatsapp, hero_titulo
) values (
  'Hogar de reposo',
  'Hogar de reposo para adultos mayores.',
  'Hola, me gustaría recibir información sobre el hogar de reposo para un familiar.',
  'Cuidamos a quienes más quieres, como parte de nuestra familia'
);

-- Listas editables. Todas con el mismo patrón: orden manual y fechas.
create table public.servicios (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null check (char_length(titulo) between 1 and 100),
  descripcion text not null default '' check (char_length(descripcion) <= 500),
  icono       text not null default 'HeartHandshake' check (char_length(icono) <= 40),
  orden       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.razones (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null check (char_length(titulo) between 1 and 100),
  descripcion text not null default '' check (char_length(descripcion) <= 500),
  icono       text not null default 'ShieldCheck' check (char_length(icono) <= 40),
  orden       integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.testimonios (
  id         uuid primary key default gen_random_uuid(),
  texto      text not null check (char_length(texto) between 1 and 800),
  autor      text not null check (char_length(autor) between 1 and 100),
  relacion   text not null default '' check (char_length(relacion) <= 100),
  orden      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.preguntas_frecuentes (
  id         uuid primary key default gen_random_uuid(),
  pregunta   text not null check (char_length(pregunta) between 1 and 200),
  respuesta  text not null check (char_length(respuesta) between 1 and 2000),
  orden      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fotos (
  id         uuid primary key default gen_random_uuid(),
  ruta       text not null unique check (ruta ~ '^galeria/[0-9a-f-]{36}\.(webp|jpg|png)$'),
  alt        text not null check (char_length(alt) between 1 and 200),
  ancho      integer not null check (ancho between 1 and 10000),
  alto       integer not null check (alto between 1 and 10000),
  orden      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers de updated_at, RLS y permisos: iguales para todas las tablas de contenido.
do $$
declare
  v_tabla text;
begin
  foreach v_tabla in array array[
    'configuracion_sitio', 'servicios', 'razones', 'testimonios', 'preguntas_frecuentes', 'fotos'
  ] loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.actualizar_updated_at()',
      v_tabla || '_actualizar_updated_at', v_tabla
    );

    execute format('alter table public.%I enable row level security', v_tabla);
    execute format('revoke all on table public.%I from anon, authenticated', v_tabla);

    -- Lectura pública: es el contenido que muestra el sitio.
    execute format('grant select on table public.%I to anon, authenticated', v_tabla);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      v_tabla || ': lectura pública', v_tabla
    );

    -- Escritura: solo el rol "sitio".
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select public.tiene_rol(''sitio''))) with check ((select public.tiene_rol(''sitio'')))',
      v_tabla || ': rol sitio actualiza', v_tabla
    );
  end loop;

  -- Las listas además admiten crear y borrar (la configuración es una fila única fija).
  foreach v_tabla in array array['servicios', 'razones', 'testimonios', 'preguntas_frecuentes', 'fotos'] loop
    execute format('grant insert, update, delete on table public.%I to authenticated', v_tabla);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select public.tiene_rol(''sitio'')))',
      v_tabla || ': rol sitio crea', v_tabla
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select public.tiene_rol(''sitio'')))',
      v_tabla || ': rol sitio borra', v_tabla
    );
  end loop;
end;
$$;

-- La configuración solo se actualiza (nunca se crea ni se borra desde la aplicación),
-- y nunca su id.
grant update (
  nombre, descripcion_corta, whatsapp, mensaje_whatsapp, telefono, email_contacto,
  email_notificaciones, email_remitente, direccion, ciudad, region, horario_visitas,
  maps_embed_url, maps_url, hero_titulo, hero_subtitulo, hero_foto, hero_foto_ancho,
  hero_foto_alto, hero_foto_alt, nosotros_texto, destacados, servicios_intro,
  instalaciones_intro, razon_social, rut, email_privacidad, plazo_conservacion,
  plazo_respuesta, fecha_privacidad
) on table public.configuracion_sitio to authenticated;


-- -----------------------------------------------------------------------------
-- 3. FOTOS (Supabase Storage)
-- Bucket público: cualquiera puede VER una foto por su URL (se muestran en el sitio),
-- pero nadie puede listar el bucket, y solo el rol "sitio" puede subir o borrar.
-- Límites del propio Storage: 3 MB y solo imágenes.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sitio', 'sitio', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "sitio: rol sitio ve sus archivos"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'sitio' and (select public.tiene_rol('sitio')));

create policy "sitio: rol sitio sube fotos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'sitio' and (select public.tiene_rol('sitio')));

create policy "sitio: rol sitio reemplaza fotos"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'sitio' and (select public.tiene_rol('sitio')))
  with check (bucket_id = 'sitio' and (select public.tiene_rol('sitio')));

create policy "sitio: rol sitio borra fotos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'sitio' and (select public.tiene_rol('sitio')));
