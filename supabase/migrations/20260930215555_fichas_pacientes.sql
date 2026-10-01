-- =============================================================================
-- Módulo Pacientes: fichas de residentes. Contienen datos de SALUD, que la ley
-- chilena considera datos sensibles: el acceso se restringe en la base de datos.
--
-- Permisos (exigidos por RLS, no solo por la aplicación):
--   - rol "pacientes":          ver y editar fichas; ver el historial de auditoría.
--   - rol "pacientes_lectura":  solo ver fichas.
--   - otros administradores y visitantes (anon): nada.
--
-- Capas adicionales:
--   - Las fichas no se borran desde la aplicación: se egresan (fecha_egreso).
--   - Auditoría: cada alta, cambio (con el valor anterior) y eliminación, y cada
--     consulta de una ficha, quedan registrados con quién y cuándo. Nadie puede
--     modificar ni borrar ese registro desde la aplicación.
--   - El QR de cada ficha solo contiene un código aleatorio (codigo_qr), sin datos
--     del paciente. Se puede regenerar para invalidar una etiqueta perdida.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. PERMISOS
-- -----------------------------------------------------------------------------

-- SECURITY DEFINER (como tiene_rol): se usan en políticas RLS.
create function public.puede_ver_fichas()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.tiene_rol('pacientes') or public.tiene_rol('pacientes_lectura');
$$;

create function public.puede_editar_fichas()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.tiene_rol('pacientes');
$$;

revoke execute on function public.puede_ver_fichas() from public, anon;
revoke execute on function public.puede_editar_fichas() from public, anon;
grant execute on function public.puede_ver_fichas() to authenticated;
grant execute on function public.puede_editar_fichas() to authenticated;


-- -----------------------------------------------------------------------------
-- 2. FICHAS
-- -----------------------------------------------------------------------------

create type public.grado_deterioro as enum (
  'no_evaluado', 'sin_deterioro', 'leve', 'moderado', 'severo'
);

create type public.sexo_paciente as enum ('femenino', 'masculino', 'otro');

create table public.pacientes (
  id                  uuid primary key default gen_random_uuid(),
  -- Código del QR: aleatorio (122 bits), sin relación con los datos del paciente.
  codigo_qr           text not null unique
                        default replace(gen_random_uuid()::text, '-', '')
                        check (codigo_qr ~ '^[0-9a-f]{32}$'),

  -- Identificación
  nombres             text not null check (char_length(trim(nombres)) between 1 and 100),
  apellidos           text not null check (char_length(trim(apellidos)) between 1 and 100),
  -- RUT sin puntos y con guion: 12345678-9 ("" = no registrado).
  rut                 text not null default '' check (rut = '' or rut ~ '^[0-9]{7,8}-[0-9K]$'),
  fecha_nacimiento    date check (fecha_nacimiento >= '1900-01-01'),
  sexo                public.sexo_paciente,

  -- Estadía (fecha_egreso null = residente activo)
  fecha_ingreso       date check (fecha_ingreso >= '1950-01-01'),
  habitacion          text not null default '' check (char_length(habitacion) <= 50),
  fecha_egreso        date,

  -- Salud general
  alergias            text not null default '' check (char_length(alergias) <= 1000),
  prevision           text not null default '' check (char_length(prevision) <= 100),
  medico_tratante     text not null default '' check (char_length(medico_tratante) <= 150),

  -- Deterioro cognitivo y observaciones
  deterioro_cognitivo public.grado_deterioro not null default 'no_evaluado',
  deterioro_detalle   text not null default '' check (char_length(deterioro_detalle) <= 1000),
  observaciones       text not null default '' check (char_length(observaciones) <= 5000),

  -- Contacto de emergencia
  contacto_nombre     text not null default '' check (char_length(contacto_nombre) <= 100),
  contacto_parentesco text not null default '' check (char_length(contacto_parentesco) <= 50),
  contacto_telefono   text not null default ''
                        check (contacto_telefono = '' or contacto_telefono ~ '^\+56[0-9]{9}$'),

  -- Trazabilidad (los fija el trigger; la aplicación no puede escribirlos)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid,
  updated_by          uuid,

  constraint pacientes_egreso_despues_de_ingreso
    check (fecha_egreso is null or fecha_ingreso is null or fecha_egreso >= fecha_ingreso)
);

comment on table public.pacientes is
  'Fichas de residentes (datos de salud, sensibles). No se borran: se egresan.';

-- Un RUT no puede repetirse (evita fichas duplicadas).
create unique index pacientes_rut_unico on public.pacientes (rut) where rut <> '';
create index pacientes_por_apellido on public.pacientes (apellidos, nombres);


-- -----------------------------------------------------------------------------
-- 3. MEDICAMENTOS
-- -----------------------------------------------------------------------------

create table public.medicamentos (
  id                 uuid primary key default gen_random_uuid(),
  paciente_id        uuid not null references public.pacientes (id) on delete cascade,
  nombre             text not null check (char_length(trim(nombre)) between 1 and 150),
  -- Dosis o medida: "50 mg", "1 comprimido", "10 gotas".
  dosis              text not null check (char_length(trim(dosis)) between 1 and 100),
  indicaciones       text not null default '' check (char_length(indicaciones) <= 500),
  -- Situacional ("SOS"): se da solo ante una situación, que debe quedar indicada.
  situacional        boolean not null default false,
  motivo_situacional text not null default '' check (char_length(motivo_situacional) <= 500),
  -- Horas del día en que se administra (los programados necesitan al menos una).
  horarios           time[] not null default '{}'
                       check (cardinality(horarios) <= 12 and array_position(horarios, null) is null),
  -- Días de la semana (ISO 8601: 1 = lunes … 7 = domingo). Por defecto, todos.
  dias               smallint[] not null default '{1,2,3,4,5,6,7}'
                       check (cardinality(dias) between 1 and 7 and dias <@ '{1,2,3,4,5,6,7}'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid,
  updated_by         uuid,

  constraint medicamentos_situacional_con_motivo check (
    (situacional and char_length(trim(motivo_situacional)) > 0)
    or (not situacional and cardinality(horarios) > 0 and motivo_situacional = '')
  )
);

comment on table public.medicamentos is
  'Medicamentos de cada residente: programados (con horas) o situacionales (con motivo).';

create index medicamentos_por_paciente on public.medicamentos (paciente_id);


-- -----------------------------------------------------------------------------
-- 4. AUDITORÍA
-- -----------------------------------------------------------------------------

create table public.auditoria_fichas (
  id            bigint generated always as identity primary key,
  fecha         timestamptz not null default now(),
  -- Quién: su id y una copia del correo (se conserva aunque la cuenta se elimine).
  -- null si el cambio se hizo directo por SQL (ej: desde el Dashboard de Supabase).
  usuario_id    uuid,
  usuario_email text,
  -- Sin llave foránea: el registro se conserva aunque la ficha se elimine por SQL.
  paciente_id   uuid not null,
  accion        text not null check (accion in ('consulta', 'creacion', 'edicion', 'eliminacion')),
  tabla         text check (tabla in ('pacientes', 'medicamentos')),
  -- Qué se modificó, aunque su nombre no haya cambiado (ej: el medicamento editado).
  referencia    text,
  -- En una edición, solo los campos que cambiaron: valor anterior y valor nuevo.
  antes         jsonb,
  despues       jsonb
);

comment on table public.auditoria_fichas is
  'Quién vio o cambió cada ficha y cuándo. Solo se escribe mediante triggers y funciones.';

create index auditoria_fichas_por_paciente on public.auditoria_fichas (paciente_id, fecha desc);

-- Registra altas, cambios y eliminaciones. SECURITY DEFINER: escribe en la auditoría,
-- donde ningún rol de la aplicación puede escribir directamente.
create function privado.auditar_ficha()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila    jsonb := coalesce(to_jsonb(new), to_jsonb(old));
  v_antes   jsonb;
  v_despues jsonb;
begin
  if tg_op = 'INSERT' then
    v_despues := to_jsonb(new);
  elsif tg_op = 'DELETE' then
    v_antes := to_jsonb(old);
  else
    -- Solo los campos que cambiaron (sin las marcas de tiempo ni el autor).
    select jsonb_object_agg(n.key, o.value), jsonb_object_agg(n.key, n.value)
      into v_antes, v_despues
      from jsonb_each(to_jsonb(new)) as n
      join jsonb_each(to_jsonb(old)) as o using (key)
     where n.value is distinct from o.value
       and n.key not in ('updated_at', 'updated_by');
    if v_despues is null then
      return null;  -- guardado sin cambios reales: nada que registrar
    end if;
  end if;

  insert into public.auditoria_fichas
    (usuario_id, usuario_email, paciente_id, accion, tabla, referencia, antes, despues)
  values (
    (select auth.uid()),
    (select auth.jwt() ->> 'email'),
    case tg_table_name
      when 'pacientes' then (v_fila ->> 'id')::uuid
      else (v_fila ->> 'paciente_id')::uuid
    end,
    case tg_op when 'INSERT' then 'creacion' when 'UPDATE' then 'edicion' else 'eliminacion' end,
    tg_table_name,
    case tg_table_name when 'medicamentos' then v_fila ->> 'nombre' end,
    v_antes,
    v_despues
  );
  return null;
end;
$$;

revoke execute on function privado.auditar_ficha() from public, anon, authenticated;

-- Registra que alguien abrió una ficha. Se ignoran las repeticiones de la misma
-- persona dentro de 5 minutos (recargas de página).
create function public.registrar_consulta_ficha(p_paciente_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.puede_ver_fichas() then
    raise exception 'Sin permiso para ver fichas' using errcode = '42501';
  end if;
  if not exists (select 1 from public.pacientes where id = p_paciente_id) then
    raise exception 'Ficha no encontrada' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.auditoria_fichas
     where paciente_id = p_paciente_id
       and usuario_id = (select auth.uid())
       and accion = 'consulta'
       and fecha > now() - interval '5 minutes'
  ) then
    return;
  end if;

  insert into public.auditoria_fichas (usuario_id, usuario_email, paciente_id, accion)
  values ((select auth.uid()), (select auth.jwt() ->> 'email'), p_paciente_id, 'consulta');
end;
$$;

revoke execute on function public.registrar_consulta_ficha(uuid) from public, anon;
grant execute on function public.registrar_consulta_ficha(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 5. TRIGGERS: autor, fechas y auditoría
-- -----------------------------------------------------------------------------

-- Fija quién creó/modificó y cuándo, sin importar lo que envíe la aplicación.
create function privado.registrar_autor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := (select auth.uid());
  end if;
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke execute on function privado.registrar_autor() from public, anon, authenticated;

create trigger pacientes_autor
  before insert or update on public.pacientes
  for each row execute function privado.registrar_autor();

create trigger pacientes_auditoria
  after insert or update or delete on public.pacientes
  for each row execute function privado.auditar_ficha();

create trigger medicamentos_autor
  before insert or update on public.medicamentos
  for each row execute function privado.registrar_autor();

create trigger medicamentos_auditoria
  after insert or update or delete on public.medicamentos
  for each row execute function privado.auditar_ficha();


-- -----------------------------------------------------------------------------
-- 6. RLS Y PRIVILEGIOS
-- -----------------------------------------------------------------------------

alter table public.pacientes enable row level security;
alter table public.medicamentos enable row level security;
alter table public.auditoria_fichas enable row level security;

-- Supabase otorga todo por defecto en public: se parte de cero.
revoke all on table public.pacientes, public.medicamentos, public.auditoria_fichas
  from anon, authenticated;

-- Fichas: leer, crear y editar columnas concretas. Sin DELETE: se egresan.
grant select on table public.pacientes to authenticated;
grant insert (
  nombres, apellidos, rut, fecha_nacimiento, sexo, fecha_ingreso, habitacion, alergias,
  prevision, medico_tratante, deterioro_cognitivo, deterioro_detalle, observaciones,
  contacto_nombre, contacto_parentesco, contacto_telefono
) on table public.pacientes to authenticated;
grant update (
  nombres, apellidos, rut, fecha_nacimiento, sexo, fecha_ingreso, habitacion, fecha_egreso,
  alergias, prevision, medico_tratante, deterioro_cognitivo, deterioro_detalle, observaciones,
  contacto_nombre, contacto_parentesco, contacto_telefono, codigo_qr
) on table public.pacientes to authenticated;

-- Medicamentos: un medicamento no se puede mover a otro paciente (paciente_id fijo).
grant select, delete on table public.medicamentos to authenticated;
grant insert (
  paciente_id, nombre, dosis, indicaciones, situacional, motivo_situacional, horarios, dias
) on table public.medicamentos to authenticated;
grant update (
  nombre, dosis, indicaciones, situacional, motivo_situacional, horarios, dias
) on table public.medicamentos to authenticated;

-- Auditoría: solo lectura (se escribe mediante triggers y registrar_consulta_ficha).
grant select on table public.auditoria_fichas to authenticated;

create policy "pacientes: ver con rol pacientes o pacientes_lectura"
  on public.pacientes for select to authenticated
  using ((select public.puede_ver_fichas()));
create policy "pacientes: crear con rol pacientes"
  on public.pacientes for insert to authenticated
  with check ((select public.puede_editar_fichas()));
create policy "pacientes: editar con rol pacientes"
  on public.pacientes for update to authenticated
  using ((select public.puede_editar_fichas()))
  with check ((select public.puede_editar_fichas()));

create policy "medicamentos: ver con rol pacientes o pacientes_lectura"
  on public.medicamentos for select to authenticated
  using ((select public.puede_ver_fichas()));
create policy "medicamentos: crear con rol pacientes"
  on public.medicamentos for insert to authenticated
  with check ((select public.puede_editar_fichas()));
create policy "medicamentos: editar con rol pacientes"
  on public.medicamentos for update to authenticated
  using ((select public.puede_editar_fichas()))
  with check ((select public.puede_editar_fichas()));
create policy "medicamentos: borrar con rol pacientes"
  on public.medicamentos for delete to authenticated
  using ((select public.puede_editar_fichas()));

create policy "auditoria_fichas: ver con rol pacientes"
  on public.auditoria_fichas for select to authenticated
  using ((select public.puede_editar_fichas()));
