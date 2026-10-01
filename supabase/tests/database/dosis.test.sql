-- =============================================================================
-- Tests del registro de dosis (administraciones): permisos, reglas y anulación.
-- Ejecutar con:  pnpm db:test   (todo se revierte al final: no deja datos)
-- Las horas se calculan desde "ahora" (hora de Chile) para que el test sea determinista.
-- =============================================================================
begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000d101',
   'authenticated', 'authenticated', 'editor-dosis@example.com'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000d102',
   'authenticated', 'authenticated', 'cuidador-dosis@example.com'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000d103',
   'authenticated', 'authenticated', 'sitio-dosis@example.com');
insert into public.admins (user_id, email) values
  ('00000000-0000-4000-8000-00000000d101', 'editor-dosis@example.com'),
  ('00000000-0000-4000-8000-00000000d102', 'cuidador-dosis@example.com'),
  ('00000000-0000-4000-8000-00000000d103', 'sitio-dosis@example.com');
insert into public.admin_roles (user_id, rol) values
  ('00000000-0000-4000-8000-00000000d101', 'pacientes'),
  ('00000000-0000-4000-8000-00000000d102', 'pacientes_lectura'),
  ('00000000-0000-4000-8000-00000000d103', 'sitio');

-- Una dosis de hace 1 hora (ya se puede registrar) y otra en 5 horas (todavía no).
select set_config('test.pasada', to_char(date_trunc('minute',
  (now() at time zone 'America/Santiago') - interval '1 hour'), 'YYYY-MM-DD HH24:MI'), true);
select set_config('test.futura', to_char(date_trunc('minute',
  (now() at time zone 'America/Santiago') + interval '5 hours'), 'YYYY-MM-DD HH24:MI'), true);
select set_config('test.hoy', ((now() at time zone 'America/Santiago')::date)::text, true);

insert into public.pacientes (id, nombres, apellidos) values
  ('00000000-0000-4000-8000-00000000da01', 'Dosis', 'Activa'),
  ('00000000-0000-4000-8000-00000000da02', 'Dosis', 'Egresada');
update public.pacientes set fecha_egreso = current_setting('test.hoy')::date
 where id = '00000000-0000-4000-8000-00000000da02';
insert into public.medicamentos (id, paciente_id, nombre, dosis, horarios) values
  ('00000000-0000-4000-8000-00000000db01', '00000000-0000-4000-8000-00000000da01',
   'Programado', '10 mg',
   array[split_part(current_setting('test.pasada'), ' ', 2)::time,
         split_part(current_setting('test.futura'), ' ', 2)::time]),
  ('00000000-0000-4000-8000-00000000db03', '00000000-0000-4000-8000-00000000da02',
   'De egresado', '5 mg', array[split_part(current_setting('test.pasada'), ' ', 2)::time]);
insert into public.medicamentos (id, paciente_id, nombre, dosis, situacional, motivo_situacional)
values ('00000000-0000-4000-8000-00000000db02', '00000000-0000-4000-8000-00000000da01',
        'Rescate', '500 mg', true, 'Dolor');

-- -----------------------------------------------------------------------------
-- Cuidador (rol "pacientes_lectura"): registra dosis.
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000d102","role":"authenticated","email":"cuidador-dosis@example.com"}',
  true
);

select lives_ok(
  $$ insert into public.administraciones (medicamento_id, fecha, hora_programada, resultado)
     values ('00000000-0000-4000-8000-00000000db01',
             split_part(current_setting('test.pasada'), ' ', 1)::date,
             split_part(current_setting('test.pasada'), ' ', 2)::time, 'administrada') $$,
  'cuidador: registra una dosis programada como dada'
);
select is(
  (select paciente_id::text || '|' || medicamento_nombre || '|' || dosis || '|' || registrado_email
     from public.administraciones where medicamento_id = '00000000-0000-4000-8000-00000000db01'),
  '00000000-0000-4000-8000-00000000da01|Programado|10 mg|cuidador-dosis@example.com',
  'la base de datos fija el paciente, copia nombre y dosis, y registra quién'
);
select is(
  (select registrado_por from public.administraciones
    where medicamento_id = '00000000-0000-4000-8000-00000000db01'),
  '00000000-0000-4000-8000-00000000d102'::uuid,
  'registrado_por es quien tiene la sesión'
);
select throws_ok(
  $$ insert into public.administraciones (medicamento_id, fecha, hora_programada, resultado)
     values ('00000000-0000-4000-8000-00000000db01',
             split_part(current_setting('test.pasada'), ' ', 1)::date,
             split_part(current_setting('test.pasada'), ' ', 2)::time, 'administrada') $$,
  '23505', null,
  'una misma dosis no se puede registrar dos veces'
);
select throws_ok(
  $$ insert into public.administraciones (medicamento_id, fecha, hora_programada, resultado)
     values ('00000000-0000-4000-8000-00000000db01',
             split_part(current_setting('test.futura'), ' ', 1)::date,
             split_part(current_setting('test.futura'), ' ', 2)::time, 'administrada') $$,
  'P0001', null,
  'no se puede registrar una dosis que falta más de 2 horas para darse'
);
select throws_ok(
  $$ insert into public.administraciones (medicamento_id, fecha, hora_programada, resultado)
     values ('00000000-0000-4000-8000-00000000db01',
             split_part(current_setting('test.pasada'), ' ', 1)::date,
             split_part(current_setting('test.pasada'), ' ', 2)::time - interval '1 minute',
             'administrada') $$,
  'P0001', 'hora_no_corresponde',
  'la hora debe ser una de las del medicamento'
);
select throws_ok(
  $$ insert into public.administraciones (medicamento_id, fecha, hora_programada, resultado)
     values ('00000000-0000-4000-8000-00000000db01',
             current_setting('test.hoy')::date - 3,
             split_part(current_setting('test.pasada'), ' ', 2)::time, 'administrada') $$,
  'P0001', 'fecha_fuera_de_plazo',
  'solo se registran dosis de hoy o de ayer'
);
select throws_ok(
  $$ insert into public.administraciones (medicamento_id, fecha, hora_programada, resultado)
     values ('00000000-0000-4000-8000-00000000db01',
             split_part(current_setting('test.pasada'), ' ', 1)::date,
             split_part(current_setting('test.pasada'), ' ', 2)::time, 'omitida') $$,
  '23514', null,
  'una dosis no dada exige el motivo'
);
select throws_ok(
  $$ insert into public.administraciones
       (medicamento_id, fecha, hora_programada, resultado, motivo_omision)
     values ('00000000-0000-4000-8000-00000000db01',
             split_part(current_setting('test.pasada'), ' ', 1)::date,
             split_part(current_setting('test.pasada'), ' ', 2)::time, 'omitida', 'otro') $$,
  '23514', null,
  'motivo "otro" exige el detalle'
);
select throws_ok(
  $$ insert into public.administraciones (medicamento_id, hora_programada, resultado, observacion)
     values ('00000000-0000-4000-8000-00000000db02', '08:00', 'administrada', 'Dolor') $$,
  'P0001', 'situacional_sin_horario',
  'un situacional no lleva hora programada'
);
select throws_ok(
  $$ insert into public.administraciones (medicamento_id, resultado)
     values ('00000000-0000-4000-8000-00000000db02', 'administrada') $$,
  'P0001', 'situacional_sin_observacion',
  'un situacional exige indicar la situación'
);
select lives_ok(
  $$ insert into public.administraciones (medicamento_id, resultado, observacion)
     values ('00000000-0000-4000-8000-00000000db02', 'administrada', 'Dolor 6/10') $$,
  'cuidador: registra un situacional con la situación'
);
select is(
  (select fecha::text from public.administraciones
    where medicamento_id = '00000000-0000-4000-8000-00000000db02'),
  current_setting('test.hoy'),
  'el situacional queda con la fecha de hoy (la fija la base de datos)'
);
select throws_ok(
  $$ insert into public.administraciones (medicamento_id, fecha, hora_programada, resultado)
     values ('00000000-0000-4000-8000-00000000db03',
             split_part(current_setting('test.pasada'), ' ', 1)::date,
             split_part(current_setting('test.pasada'), ' ', 2)::time, 'administrada') $$,
  'P0001', 'paciente_egresado',
  'no se registran dosis de residentes egresados'
);
select throws_ok(
  $$ update public.administraciones set resultado = 'omitida' $$,
  '42501', null,
  'cuidador: NO puede editar registros'
);
select throws_ok(
  $$ delete from public.administraciones $$,
  '42501', null,
  'cuidador: NO puede borrar registros'
);
select lives_ok(
  $$ select public.anular_administracion(
       (select id from public.administraciones
         where medicamento_id = '00000000-0000-4000-8000-00000000db01'),
       'Registré el paciente equivocado') $$,
  'cuidador: puede anular su propio registro, con motivo'
);
select lives_ok(
  $$ insert into public.administraciones (medicamento_id, fecha, hora_programada, resultado, motivo_omision)
     values ('00000000-0000-4000-8000-00000000db01',
             split_part(current_setting('test.pasada'), ' ', 1)::date,
             split_part(current_setting('test.pasada'), ' ', 2)::time, 'omitida', 'dormido') $$,
  'tras anular, esa dosis se puede volver a registrar'
);
select throws_ok(
  $$ select public.anular_administracion(gen_random_uuid(), 'x') $$,
  '22023', null,
  'anular exige un motivo de al menos 3 caracteres'
);

reset role;

-- -----------------------------------------------------------------------------
-- Editor (rol "pacientes"): anula registros de otros; el cuidador no.
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000d101","role":"authenticated","email":"editor-dosis@example.com"}',
  true
);

select is(
  (select count(*)::int from public.administraciones
    where paciente_id = '00000000-0000-4000-8000-00000000da01'),
  3,
  'editor: ve todos los registros del paciente, incluido el anulado'
);
select lives_ok(
  $$ select public.anular_administracion(
       (select id from public.administraciones
         where medicamento_id = '00000000-0000-4000-8000-00000000db02'),
       'Se registró dos veces por error') $$,
  'editor: puede anular el registro de otra persona'
);
select throws_ok(
  $$ select public.anular_administracion(
       (select id from public.administraciones
         where medicamento_id = '00000000-0000-4000-8000-00000000db02'),
       'Otra vez') $$,
  '42501', null,
  'un registro ya anulado no se vuelve a anular'
);
select lives_ok(
  $$ insert into public.administraciones (medicamento_id, resultado, observacion)
     values ('00000000-0000-4000-8000-00000000db02', 'administrada', 'Fiebre 38,5 °C') $$,
  'editor: también registra dosis'
);
select set_config(
  'test.registro_editor',
  (select id::text from public.administraciones
    where registrado_por = '00000000-0000-4000-8000-00000000d101'),
  true
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000d102","role":"authenticated"}',
  true
);
select throws_ok(
  $$ select public.anular_administracion(current_setting('test.registro_editor')::uuid, 'No corresponde') $$,
  '42501', null,
  'cuidador: NO puede anular registros de otras personas'
);

-- -----------------------------------------------------------------------------
-- Rol "sitio" y anónimo: nada.
-- -----------------------------------------------------------------------------
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000d103","role":"authenticated"}',
  true
);
select is((select count(*)::int from public.administraciones), 0, 'rol sitio: NO ve registros de dosis');
select throws_ok(
  $$ insert into public.administraciones (medicamento_id, resultado, observacion)
     values ('00000000-0000-4000-8000-00000000db02', 'administrada', 'Intruso') $$,
  'P0001', 'medicamento_inexistente',
  'rol sitio: NO puede registrar dosis (ni siquiera ve el medicamento)'
);

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select * from public.administraciones $$, '42501', null, 'anon: NO puede leer registros de dosis');
select throws_ok(
  $$ select public.anular_administracion(gen_random_uuid(), 'Intento anónimo') $$,
  '42501', null,
  'anon: NO puede anular registros'
);

reset role;

-- -----------------------------------------------------------------------------
-- Quitar un medicamento de la ficha no borra su historial de dosis.
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000d101","role":"authenticated"}',
  true
);
select lives_ok(
  $$ delete from public.medicamentos where id = '00000000-0000-4000-8000-00000000db01' $$,
  'editor: quita un medicamento que tiene dosis registradas'
);
select is(
  (select count(*)::int from public.administraciones
    where medicamento_nombre = 'Programado' and medicamento_id is null),
  2,
  'sus registros de dosis se conservan, con el nombre del medicamento'
);

reset role;

select * from finish();
rollback;
