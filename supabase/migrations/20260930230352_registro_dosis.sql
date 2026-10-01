-- =============================================================================
-- Registro de administración de medicamentos: cada dosis dada o no dada.
--
-- - Lo registran quienes ven fichas (roles "pacientes" y "pacientes_lectura"): los
--   cuidadores son quienes dan los medicamentos. Siguen sin poder editar la ficha.
-- - Los registros no se editan ni se borran. Un error se ANULA, con su motivo
--   (anular_administracion), y el registro anulado sigue a la vista.
-- - La base de datos fija quién registró, cuándo, a qué paciente corresponde, y copia el
--   nombre y la dosis del medicamento: el registro se conserva aunque se quite el
--   medicamento de la ficha.
-- - Reglas de una dosis programada: se registra una sola vez; debe ser una de las horas
--   y de los días del medicamento; solo de hoy o de ayer (turno de noche), y a lo más
--   2 horas antes de su hora. Las fechas y horas son las de Chile continental.
-- =============================================================================

create type public.resultado_dosis as enum ('administrada', 'omitida');

create type public.motivo_omision as enum (
  'rechazo', 'dormido', 'ausente', 'sin_stock', 'indicacion_medica', 'otro'
);

create table public.administraciones (
  id                 uuid primary key default gen_random_uuid(),
  paciente_id        uuid not null references public.pacientes (id) on delete cascade,
  -- Si el medicamento se quita de la ficha, el registro queda (con su nombre y dosis).
  medicamento_id     uuid references public.medicamentos (id) on delete set null,
  medicamento_nombre text not null,
  dosis              text not null,
  -- Programado: día y hora que le corresponde. Situacional: día en que se dio, sin hora.
  fecha              date not null,
  hora_programada    time,
  resultado          public.resultado_dosis not null,
  motivo_omision     public.motivo_omision,
  -- Situacional: la situación (ej: "dolor 6/10"). Omitida por "otro": el detalle.
  observacion        text not null default '' check (char_length(observacion) <= 500),
  registrado_en      timestamptz not null default now(),
  registrado_por     uuid,
  registrado_email   text,
  anulada_en         timestamptz,
  anulada_por        uuid,
  anulada_email      text,
  anulacion_motivo   text not null default '' check (char_length(anulacion_motivo) <= 300),

  constraint administraciones_motivo_si_omitida check (
    (resultado = 'administrada' and motivo_omision is null)
    or (resultado = 'omitida' and motivo_omision is not null)
  ),
  constraint administraciones_otro_con_detalle check (
    motivo_omision is distinct from 'otro' or char_length(trim(observacion)) > 0
  ),
  constraint administraciones_anulacion_con_motivo check (
    anulada_en is null or char_length(trim(anulacion_motivo)) > 0
  )
);

comment on table public.administraciones is
  'Dosis dadas o no dadas. No se editan ni se borran: se anulan con motivo.';

-- Una dosis programada se registra una sola vez (salvo que el registro se anule).
create unique index administraciones_una_vez_por_dosis
  on public.administraciones (medicamento_id, fecha, hora_programada)
  where anulada_en is null and hora_programada is not null;
create index administraciones_por_paciente on public.administraciones (paciente_id, fecha desc);
create index administraciones_por_fecha on public.administraciones (fecha);

-- Completa y valida cada registro. Se ejecuta con los permisos de quien registra (RLS
-- aplica): quien no puede ver fichas no encuentra el medicamento y recibe un error genérico.
-- Los errores usan códigos fijos (P0001) que la aplicación traduce a mensajes amables.
create function privado.preparar_administracion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_med    public.medicamentos%rowtype;
  v_egreso date;
  v_ahora  timestamp := now() at time zone 'America/Santiago';
  v_hoy    date := (now() at time zone 'America/Santiago')::date;
begin
  select * into v_med from public.medicamentos where id = new.medicamento_id;
  if not found then
    raise exception 'medicamento_inexistente' using errcode = 'P0001';
  end if;
  select fecha_egreso into v_egreso from public.pacientes where id = v_med.paciente_id;
  if v_egreso is not null then
    raise exception 'paciente_egresado' using errcode = 'P0001';
  end if;

  -- Lo fija la base de datos, sin importar lo que envíe la aplicación.
  new.paciente_id        := v_med.paciente_id;
  new.medicamento_nombre := v_med.nombre;
  new.dosis              := v_med.dosis;
  new.registrado_en      := now();
  new.registrado_por     := (select auth.uid());
  new.registrado_email   := (select auth.jwt() ->> 'email');
  new.anulada_en         := null;
  new.anulada_por        := null;
  new.anulada_email      := null;
  new.anulacion_motivo   := '';

  if v_med.situacional then
    if new.hora_programada is not null or new.resultado <> 'administrada' then
      raise exception 'situacional_sin_horario' using errcode = 'P0001';
    end if;
    if char_length(trim(new.observacion)) = 0 then
      raise exception 'situacional_sin_observacion' using errcode = 'P0001';
    end if;
    new.fecha := v_hoy;
  else
    if new.hora_programada is null or not (new.hora_programada = any (v_med.horarios)) then
      raise exception 'hora_no_corresponde' using errcode = 'P0001';
    end if;
    if new.fecha is null or new.fecha not between v_hoy - 1 and v_hoy then
      raise exception 'fecha_fuera_de_plazo' using errcode = 'P0001';
    end if;
    if not (extract(isodow from new.fecha)::smallint = any (v_med.dias)) then
      raise exception 'dia_no_corresponde' using errcode = 'P0001';
    end if;
    if new.fecha + new.hora_programada > v_ahora + interval '2 hours' then
      raise exception 'dosis_futura' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function privado.preparar_administracion() from public, anon, authenticated;

create trigger administraciones_preparar
  before insert on public.administraciones
  for each row execute function privado.preparar_administracion();

-- Anula un registro (nunca lo borra). Puede hacerlo quien lo registró o el rol "pacientes".
create function public.anular_administracion(p_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.puede_ver_fichas() then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  if p_motivo is null or char_length(trim(p_motivo)) not between 3 and 300 then
    raise exception 'motivo_anulacion' using errcode = '22023';
  end if;

  update public.administraciones
     set anulada_en       = now(),
         anulada_por      = (select auth.uid()),
         anulada_email    = (select auth.jwt() ->> 'email'),
         anulacion_motivo = trim(p_motivo)
   where id = p_id
     and anulada_en is null
     and (registrado_por = (select auth.uid()) or public.puede_editar_fichas());

  if not found then
    raise exception 'No se puede anular este registro' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.anular_administracion(uuid, text) from public, anon;
grant execute on function public.anular_administracion(uuid, text) to authenticated;

-- RLS y privilegios: ver y registrar con permiso de fichas; nunca editar ni borrar.
alter table public.administraciones enable row level security;
revoke all on table public.administraciones from anon, authenticated;

grant select on table public.administraciones to authenticated;
grant insert (medicamento_id, fecha, hora_programada, resultado, motivo_omision, observacion)
  on table public.administraciones to authenticated;

create policy "administraciones: ver con permiso de fichas"
  on public.administraciones for select to authenticated
  using ((select public.puede_ver_fichas()));
create policy "administraciones: registrar con permiso de fichas"
  on public.administraciones for insert to authenticated
  with check ((select public.puede_ver_fichas()));
