-- =============================================================================
-- Tests de seguridad del módulo Pacientes (fichas, medicamentos y auditoría).
-- Ejecutar con:  pnpm db:test   (todo se revierte al final: no deja datos)
-- =============================================================================
begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

-- Usuarios de prueba: editor (rol pacientes), lector (pacientes_lectura) y uno solo "sitio".
insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000e001',
   'authenticated', 'authenticated', 'editor-test@example.com'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000e002',
   'authenticated', 'authenticated', 'lector-test@example.com'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000e003',
   'authenticated', 'authenticated', 'sitio-test@example.com');
insert into public.admins (user_id, email) values
  ('00000000-0000-4000-8000-00000000e001', 'editor-test@example.com'),
  ('00000000-0000-4000-8000-00000000e002', 'lector-test@example.com'),
  ('00000000-0000-4000-8000-00000000e003', 'sitio-test@example.com');
insert into public.admin_roles (user_id, rol) values
  ('00000000-0000-4000-8000-00000000e001', 'pacientes'),
  ('00000000-0000-4000-8000-00000000e002', 'pacientes_lectura'),
  ('00000000-0000-4000-8000-00000000e003', 'sitio');

-- -----------------------------------------------------------------------------
-- Visitante anónimo: nada.
-- -----------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$ select * from public.pacientes $$, '42501', null, 'anon: NO puede leer fichas');
select throws_ok($$ select * from public.medicamentos $$, '42501', null, 'anon: NO puede leer medicamentos');
select throws_ok($$ select * from public.auditoria_fichas $$, '42501', null, 'anon: NO puede leer la auditoría');
select throws_ok(
  $$ insert into public.pacientes (nombres, apellidos) values ('Anon', 'Intruso') $$,
  '42501', null,
  'anon: NO puede crear fichas'
);
select throws_ok(
  $$ select public.registrar_consulta_ficha(gen_random_uuid()) $$,
  '42501', null,
  'anon: NO puede ejecutar registrar_consulta_ficha'
);

reset role;

-- -----------------------------------------------------------------------------
-- Editor (rol "pacientes"): ve y edita; todo queda auditado.
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000e001","role":"authenticated","email":"editor-test@example.com"}',
  true
);

select ok(public.puede_editar_fichas(), 'editor: puede_editar_fichas() es true');
select lives_ok(
  $$ insert into public.pacientes (nombres, apellidos, rut, deterioro_cognitivo, alergias)
     values ('Rosa', 'Prueba Editor', '99999999-9', 'leve', 'Penicilina') $$,
  'editor: puede crear una ficha'
);
select ok(
  (select codigo_qr ~ '^[0-9a-f]{32}$' from public.pacientes where apellidos = 'Prueba Editor'),
  'la ficha recibe un código QR aleatorio de 32 caracteres hexadecimales'
);
select is(
  (select created_by from public.pacientes where apellidos = 'Prueba Editor'),
  '00000000-0000-4000-8000-00000000e001'::uuid,
  'la base de datos registra quién creó la ficha'
);
select throws_ok(
  $$ insert into public.pacientes (nombres, apellidos, created_by)
     values ('Falso', 'Autor', '00000000-0000-4000-8000-00000000e002') $$,
  '42501', null,
  'editor: NO puede falsear el autor de una ficha'
);
select throws_ok(
  $$ insert into public.pacientes (nombres, apellidos, rut) values ('Otra', 'Persona', '99999999-9') $$,
  '23505', null,
  'no se permiten dos fichas con el mismo RUT'
);
select throws_ok(
  $$ insert into public.pacientes (nombres, apellidos, rut) values ('Otra', 'Persona', '99.999.999-9') $$,
  '23514', null,
  'el RUT se guarda sin puntos y con guion'
);

reset role;
select set_config(
  'test.paciente',
  (select id::text from public.pacientes where apellidos = 'Prueba Editor'),
  true
);
set local role authenticated;

select lives_ok(
  $$ insert into public.medicamentos (paciente_id, nombre, dosis, horarios)
     values (current_setting('test.paciente')::uuid, 'Losartán', '50 mg', '{08:00,20:00}') $$,
  'editor: puede agregar un medicamento programado'
);
select lives_ok(
  $$ insert into public.medicamentos (paciente_id, nombre, dosis, situacional, motivo_situacional)
     values (current_setting('test.paciente')::uuid, 'Paracetamol', '500 mg', true, 'Dolor o fiebre') $$,
  'editor: puede agregar un medicamento situacional con su motivo'
);
select throws_ok(
  $$ insert into public.medicamentos (paciente_id, nombre, dosis, situacional)
     values (current_setting('test.paciente')::uuid, 'Sin motivo', '1 comprimido', true) $$,
  '23514', null,
  'un medicamento situacional exige el motivo'
);
select throws_ok(
  $$ insert into public.medicamentos (paciente_id, nombre, dosis)
     values (current_setting('test.paciente')::uuid, 'Sin horario', '1 comprimido') $$,
  '23514', null,
  'un medicamento programado exige al menos una hora'
);
select throws_ok(
  $$ insert into public.medicamentos (paciente_id, nombre, dosis, horarios, dias)
     values (current_setting('test.paciente')::uuid, 'Día malo', '1 comprimido', '{08:00}', '{1,8}') $$,
  '23514', null,
  'los días del medicamento deben ser del 1 (lunes) al 7 (domingo)'
);
select lives_ok(
  $$ update public.pacientes set observaciones = 'Camina con bastón'
     where id = current_setting('test.paciente')::uuid $$,
  'editor: puede editar una ficha'
);
select lives_ok(
  $$ update public.medicamentos set dosis = '100 mg' where nombre = 'Losartán' $$,
  'editor: puede cambiar la dosis de un medicamento'
);
select lives_ok(
  $$ delete from public.medicamentos where nombre = 'Paracetamol' $$,
  'editor: puede quitar un medicamento'
);
select throws_ok(
  $$ delete from public.pacientes where id = current_setting('test.paciente')::uuid $$,
  '42501', null,
  'editor: NO puede borrar fichas (solo egresarlas)'
);
select throws_ok(
  $$ update public.medicamentos set paciente_id = gen_random_uuid() where nombre = 'Losartán' $$,
  '42501', null,
  'editor: NO puede mover un medicamento a otra ficha'
);

-- Auditoría
select is(
  (select array_agg(accion || ':' || tabla order by id)
     from public.auditoria_fichas where paciente_id = current_setting('test.paciente')::uuid),
  array['creacion:pacientes', 'creacion:medicamentos', 'creacion:medicamentos',
        'edicion:pacientes', 'edicion:medicamentos', 'eliminacion:medicamentos'],
  'auditoría: registra altas, cambios y eliminaciones de la ficha y sus medicamentos'
);
select is(
  (select antes || despues from public.auditoria_fichas
    where paciente_id = current_setting('test.paciente')::uuid
      and accion = 'edicion' and tabla = 'medicamentos'),
  '{"dosis": "100 mg"}'::jsonb || '{}'::jsonb,
  'auditoría: una edición guarda solo los campos que cambiaron'
);
select is(
  (select (antes ->> 'dosis') || ' → ' || (despues ->> 'dosis') from public.auditoria_fichas
    where paciente_id = current_setting('test.paciente')::uuid
      and accion = 'edicion' and tabla = 'medicamentos'),
  '50 mg → 100 mg',
  'auditoría: guarda el valor anterior y el nuevo'
);
select is(
  (select distinct usuario_email from public.auditoria_fichas
    where paciente_id = current_setting('test.paciente')::uuid),
  'editor-test@example.com',
  'auditoría: registra el correo de quien hizo el cambio'
);
select lives_ok(
  $$ select public.registrar_consulta_ficha(current_setting('test.paciente')::uuid) $$,
  'editor: registrar_consulta_ficha funciona'
);
select lives_ok(
  $$ select public.registrar_consulta_ficha(current_setting('test.paciente')::uuid) $$,
  'editor: una segunda consulta seguida no falla'
);
select is(
  (select count(*)::int from public.auditoria_fichas
    where paciente_id = current_setting('test.paciente')::uuid and accion = 'consulta'),
  1,
  'auditoría: las consultas repetidas en 5 minutos cuentan una sola vez'
);
select throws_ok(
  $$ insert into public.auditoria_fichas (paciente_id, accion)
     values (current_setting('test.paciente')::uuid, 'consulta') $$,
  '42501', null,
  'editor: NO puede escribir directamente en la auditoría'
);
select throws_ok(
  $$ delete from public.auditoria_fichas $$,
  '42501', null,
  'editor: NO puede borrar la auditoría'
);
select throws_ok(
  $$ update public.auditoria_fichas set usuario_email = 'otro@example.com' $$,
  '42501', null,
  'editor: NO puede alterar la auditoría'
);

reset role;

-- -----------------------------------------------------------------------------
-- Lector (rol "pacientes_lectura"): solo ve.
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000e002","role":"authenticated","email":"lector-test@example.com"}',
  true
);

select ok(public.puede_ver_fichas(), 'lector: puede_ver_fichas() es true');
select is(public.puede_editar_fichas(), false, 'lector: puede_editar_fichas() es false');
select is(
  (select count(*)::int from public.pacientes where id = current_setting('test.paciente')::uuid),
  1,
  'lector: puede ver la ficha'
);
select is(
  (select count(*)::int from public.medicamentos where paciente_id = current_setting('test.paciente')::uuid),
  1,
  'lector: puede ver sus medicamentos'
);
select is_empty(
  $$ update public.pacientes set observaciones = 'Cambio indebido' returning id $$,
  'lector: NO puede editar fichas'
);
select throws_ok(
  $$ insert into public.pacientes (nombres, apellidos) values ('Lector', 'Intruso') $$,
  '42501', null,
  'lector: NO puede crear fichas'
);
select throws_ok(
  $$ insert into public.medicamentos (paciente_id, nombre, dosis, horarios)
     values (current_setting('test.paciente')::uuid, 'Intruso', '1', '{08:00}') $$,
  '42501', null,
  'lector: NO puede agregar medicamentos'
);
select is_empty(
  $$ delete from public.medicamentos returning id $$,
  'lector: NO puede quitar medicamentos'
);
select is((select count(*)::int from public.auditoria_fichas), 0, 'lector: NO ve la auditoría');
select lives_ok(
  $$ select public.registrar_consulta_ficha(current_setting('test.paciente')::uuid) $$,
  'lector: su consulta de la ficha queda registrada'
);

reset role;

-- -----------------------------------------------------------------------------
-- Administrador solo con rol "sitio" y usuario sin rol de administrador: nada.
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-00000000e003","role":"authenticated"}',
  true
);

select is((select count(*)::int from public.pacientes), 0, 'rol sitio: NO ve fichas');
select is((select count(*)::int from public.medicamentos), 0, 'rol sitio: NO ve medicamentos');
select throws_ok(
  $$ insert into public.pacientes (nombres, apellidos) values ('Sitio', 'Intruso') $$,
  '42501', null,
  'rol sitio: NO puede crear fichas'
);
select throws_ok(
  $$ select public.registrar_consulta_ficha(current_setting('test.paciente')::uuid) $$,
  '42501', null,
  'rol sitio: NO puede registrar consultas de fichas'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000ff","role":"authenticated"}',
  true
);
select is((select count(*)::int from public.pacientes), 0, 'usuario sin rol: NO ve fichas');

reset role;

-- La consulta del lector quedó registrada a su nombre.
select is(
  (select usuario_email from public.auditoria_fichas
    where paciente_id = current_setting('test.paciente')::uuid
      and accion = 'consulta' and usuario_id = '00000000-0000-4000-8000-00000000e002'),
  'lector-test@example.com',
  'auditoría: registra quién consultó la ficha'
);

select * from finish();
rollback;
