-- =============================================================================
-- Tests de la gestión de usuarios (rol "usuarios", cuentas desactivadas y contraseñas
-- temporales). Ejecutar con:  pnpm db:test   (todo se revierte al final: no deja datos)
-- =============================================================================
begin;

create extension if not exists pgtap with schema extensions;

select plan(54);

-- Cuentas de prueba: gestor (usuarios + sitio), otro gestor y una persona solo "sitio".
insert into auth.users (instance_id, id, aud, role, email) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000f001',
   'authenticated', 'authenticated', 'gestor-test@example.com'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000f002',
   'authenticated', 'authenticated', 'gestor2-test@example.com'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-00000000f003',
   'authenticated', 'authenticated', 'solositio-test@example.com');
insert into public.admins (user_id, email, nombre) values
  ('00000000-0000-4000-8000-00000000f001', 'gestor-test@example.com', 'Gestor'),
  ('00000000-0000-4000-8000-00000000f002', 'gestor2-test@example.com', 'Gestor 2'),
  ('00000000-0000-4000-8000-00000000f003', 'solositio-test@example.com', 'Solo sitio');
insert into public.admin_roles (user_id, rol) values
  ('00000000-0000-4000-8000-00000000f001', 'usuarios'),
  ('00000000-0000-4000-8000-00000000f001', 'sitio'),
  ('00000000-0000-4000-8000-00000000f002', 'usuarios'),
  ('00000000-0000-4000-8000-00000000f003', 'sitio');

-- Claims de cada persona (se usan tras cambiar de rol).
select set_config('test.gestor',
  '{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated","email":"gestor-test@example.com"}', true);
select set_config('test.solositio',
  '{"sub":"00000000-0000-4000-8000-00000000f003","role":"authenticated","email":"solositio-test@example.com"}', true);

-- -----------------------------------------------------------------------------
-- Visitante anónimo: nada.
-- -----------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok($$ select * from public.listar_usuarios() $$, '42501', null,
  'anon: NO puede listar usuarios');
select throws_ok(
  $$ select public.crear_usuario('x@example.com', 'X', '{sitio}', 'una-contrasena-larga') $$,
  '42501', null, 'anon: NO puede crear cuentas');
select throws_ok($$ select * from public.mi_cuenta() $$, '42501', null,
  'anon: NO puede ejecutar mi_cuenta');
select throws_ok($$ select * from public.auditoria_usuarios $$, '42501', null,
  'anon: NO puede leer la auditoría de usuarios');

reset role;

-- -----------------------------------------------------------------------------
-- Administrador SIN el rol "usuarios": no administra cuentas.
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.solositio'), true);

select throws_ok($$ select * from public.listar_usuarios() $$, '42501', null,
  'sin rol usuarios: NO puede listar usuarios');
select throws_ok(
  $$ select public.crear_usuario('x@example.com', 'X', '{usuarios}', 'una-contrasena-larga') $$,
  '42501', null, 'sin rol usuarios: NO puede crear cuentas (ni darse más permisos)');
select throws_ok(
  $$ select public.actualizar_usuario('00000000-0000-4000-8000-00000000f003', 'Yo', '{sitio,usuarios}') $$,
  '42501', null, 'sin rol usuarios: NO puede darse el rol usuarios');
select throws_ok(
  $$ select public.cambiar_estado_usuario('00000000-0000-4000-8000-00000000f001', false) $$,
  '42501', null, 'sin rol usuarios: NO puede desactivar cuentas');
select throws_ok(
  $$ select public.asignar_contrasena_temporal('00000000-0000-4000-8000-00000000f001', 'una-contrasena-larga') $$,
  '42501', null, 'sin rol usuarios: NO puede asignar contraseñas');
select is((select count(*)::int from public.auditoria_usuarios), 0,
  'sin rol usuarios: NO ve la auditoría de usuarios');
select results_eq(
  $$ select nombre, roles::text[], contrasena_temporal from public.mi_cuenta() $$,
  $$ values ('Solo sitio'::text, array['sitio'], false) $$,
  'mi_cuenta(): devuelve el nombre, los roles y el estado de la contraseña propios'
);
select throws_ok($$ update public.admins set nombre = 'Otro' $$, '42501', null,
  'NO se puede editar admins directamente (solo con las funciones)');
select throws_ok(
  $$ insert into public.auditoria_usuarios (cuenta_id, cuenta_email, accion)
     values (gen_random_uuid(), 'x@example.com', 'creacion') $$,
  '42501', null, 'NO se puede escribir en la auditoría de usuarios');
select throws_ok($$ select * from privado.contrasenas_temporales $$, '42501', null,
  'NO se puede leer la tabla de contraseñas temporales');

reset role;

-- -----------------------------------------------------------------------------
-- Gestor (rol "usuarios"): crea una cuenta.
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.gestor'), true);

select ok((select count(*) >= 3 from public.listar_usuarios()), 'gestor: lista las cuentas');
select isnt(
  set_config('test.nueva',
    public.crear_usuario('  Nueva.Persona@Example.com ', ' Nueva Persona ', '{pacientes_lectura,pacientes_lectura}',
                         'temporal-abcd-efgh')::text,
    true),
  null,
  'gestor: crea una cuenta'
);
select throws_ok(
  $$ select public.crear_usuario('nueva.persona@example.com', 'Repetida', '{sitio}', 'temporal-abcd-efgh') $$,
  '23505', 'correo_existente', 'no se pueden crear dos cuentas con el mismo correo');
select throws_ok(
  $$ select public.crear_usuario('sin-arroba', 'X', '{sitio}', 'temporal-abcd-efgh') $$,
  '22023', 'correo_invalido', 'la base rechaza un correo inválido');
select throws_ok(
  $$ select public.crear_usuario('corta@example.com', 'X', '{sitio}', 'corta') $$,
  '22023', 'contrasena_invalida', 'la base rechaza una contraseña de menos de 8 caracteres');
select throws_ok(
  $$ select public.crear_usuario('sinroles@example.com', 'X', '{}', 'temporal-abcd-efgh') $$,
  '22023', 'roles_invalidos', 'la base rechaza una cuenta sin permisos');
select throws_ok(
  $$ select public.crear_usuario('sinnombre@example.com', '  ', '{sitio}', 'temporal-abcd-efgh') $$,
  '22023', 'nombre_invalido', 'la base rechaza una cuenta sin nombre');

reset role;

select is(
  (select email from auth.users where id = current_setting('test.nueva')::uuid),
  'nueva.persona@example.com',
  'la cuenta queda en Supabase Auth con el correo normalizado'
);
select ok(
  (select encrypted_password like '$2a$10$%' and email_confirmed_at is not null
     from auth.users where id = current_setting('test.nueva')::uuid),
  'la contraseña se guarda con bcrypt (costo 10) y la cuenta queda confirmada'
);
select is(
  (select count(*)::int from auth.identities
    where user_id = current_setting('test.nueva')::uuid and provider = 'email'),
  1,
  'se crea su identidad de correo (necesaria para ingresar)'
);
select results_eq(
  $$ select a.nombre, a.activo, r.rol::text from public.admins a
       join public.admin_roles r using (user_id)
      where a.user_id = current_setting('test.nueva')::uuid $$,
  $$ values ('Nueva Persona'::text, true, 'pacientes_lectura'::text) $$,
  'la cuenta queda en el panel con su nombre y sus permisos (sin repetidos)'
);
select is(
  (select count(*)::int from public.auditoria_usuarios
    where cuenta_id = current_setting('test.nueva')::uuid and accion = 'creacion'
      and usuario_email = 'gestor-test@example.com'),
  1,
  'la creación queda en la auditoría con quién la hizo'
);
select is(
  (select count(*)::int from public.auditoria_usuarios
    where coalesce(antes::text, '') || coalesce(despues::text, '') like '%temporal-abcd-efgh%'),
  0,
  'la auditoría nunca contiene contraseñas'
);

-- -----------------------------------------------------------------------------
-- Contraseña temporal: sin roles hasta que la persona la cambie.
-- -----------------------------------------------------------------------------
select set_config('test.nueva_claims',
  format('{"sub":"%s","role":"authenticated","email":"nueva.persona@example.com"}',
         current_setting('test.nueva')),
  true);

set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.nueva_claims'), true);

select ok(public.is_admin(), 'contraseña temporal: entra al panel');
select is((select contrasena_temporal from public.mi_cuenta()), true,
  'contraseña temporal: mi_cuenta() lo indica');
select is(public.tiene_rol('pacientes_lectura'), false,
  'contraseña temporal: la base NO le reconoce sus roles');
select is(public.puede_ver_fichas(), false, 'contraseña temporal: NO puede ver fichas');

reset role;
-- La persona elige su contraseña (Supabase Auth cambia el hash).
update auth.users
   set encrypted_password = extensions.crypt('la-contrasena-propia', extensions.gen_salt('bf'))
 where id = current_setting('test.nueva')::uuid;

set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.nueva_claims'), true);

select is((select contrasena_temporal from public.mi_cuenta()), false,
  'tras cambiarla: ya no es temporal');
select ok(public.puede_ver_fichas(), 'tras cambiarla: ve fichas con su rol');

reset role;

-- -----------------------------------------------------------------------------
-- Gestor: edita, desactiva, reactiva y da contraseñas temporales.
-- -----------------------------------------------------------------------------
-- Una sesión abierta de la persona, para comprobar que se cierra.
insert into auth.sessions (id, user_id) values (gen_random_uuid(), current_setting('test.nueva')::uuid);

set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.gestor'), true);

select lives_ok(
  format($$ select public.actualizar_usuario(%L, 'Persona Editada', '{pacientes}') $$,
         current_setting('test.nueva')),
  'gestor: cambia el nombre y los permisos'
);
select results_eq(
  format($$ select nombre, roles::text[] from public.listar_usuarios() where user_id = %L $$,
         current_setting('test.nueva')),
  $$ values ('Persona Editada'::text, array['pacientes']) $$,
  'los cambios quedan guardados'
);
select results_eq(
  format($$ select antes, despues from public.auditoria_usuarios
             where cuenta_id = %L and accion = 'edicion' $$, current_setting('test.nueva')),
  $$ values ('{"nombre": "Nueva Persona", "roles": ["pacientes_lectura"]}'::jsonb,
             '{"nombre": "Persona Editada", "roles": ["pacientes"]}'::jsonb) $$,
  'la edición queda en la auditoría con el valor anterior y el nuevo'
);
select throws_ok(
  $$ select public.actualizar_usuario('00000000-0000-4000-8000-00000000f001', 'Gestor', '{sitio}') $$,
  'P0001', 'propia_cuenta', 'gestor: NO puede quitarse el rol usuarios'
);
select lives_ok(
  $$ select public.actualizar_usuario('00000000-0000-4000-8000-00000000f001', 'Gestor', '{usuarios}') $$,
  'gestor: puede cambiar sus otros permisos'
);
select throws_ok(
  $$ select public.cambiar_estado_usuario('00000000-0000-4000-8000-00000000f001', false) $$,
  'P0001', 'propia_cuenta', 'gestor: NO puede desactivar su propia cuenta'
);
select throws_ok(
  $$ select public.asignar_contrasena_temporal('00000000-0000-4000-8000-00000000f001', 'una-contrasena-larga') $$,
  'P0001', 'propia_cuenta', 'gestor: NO puede darse una contraseña temporal'
);
select throws_ok(
  $$ select public.actualizar_usuario(gen_random_uuid(), 'Nadie', '{sitio}') $$,
  'P0002', 'cuenta_inexistente', 'cuenta inexistente: error claro'
);

select lives_ok(
  format($$ select public.cambiar_estado_usuario(%L, false) $$, current_setting('test.nueva')),
  'gestor: desactiva otra cuenta'
);
select throws_ok(
  format($$ select public.asignar_contrasena_temporal(%L, 'una-contrasena-larga') $$,
         current_setting('test.nueva')),
  'P0001', 'cuenta_desactivada', 'NO se da contraseña temporal a una cuenta desactivada'
);

reset role;

select ok(
  (select banned_until > now() + interval '99 years' from auth.users
    where id = current_setting('test.nueva')::uuid),
  'desactivar bloquea el ingreso en Supabase Auth'
);
select is(
  (select count(*)::int from auth.sessions where user_id = current_setting('test.nueva')::uuid),
  0,
  'desactivar cierra sus sesiones en todos los dispositivos'
);

set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.nueva_claims'), true);

select is(public.is_admin(), false, 'cuenta desactivada: NO entra al panel');
select is(public.tiene_rol('pacientes'), false, 'cuenta desactivada: la base NO le reconoce roles');
select is_empty($$ select * from public.mi_cuenta() $$, 'cuenta desactivada: mi_cuenta() no devuelve nada');

select set_config('request.jwt.claims', current_setting('test.gestor'), true);

select lives_ok(
  format($$ select public.cambiar_estado_usuario(%L, true) $$, current_setting('test.nueva')),
  'gestor: reactiva la cuenta'
);
select lives_ok(
  format($$ select public.asignar_contrasena_temporal(%L, 'otra-temporal-1234') $$,
         current_setting('test.nueva')),
  'gestor: le da una contraseña temporal'
);

reset role;

select ok(
  (select banned_until is null from auth.users where id = current_setting('test.nueva')::uuid),
  'reactivar quita el bloqueo en Supabase Auth'
);

set local role authenticated;
select set_config('request.jwt.claims', current_setting('test.nueva_claims'), true);

select ok(public.is_admin(), 'cuenta reactivada: vuelve a entrar al panel');
select is((select contrasena_temporal from public.mi_cuenta()), true,
  'nueva contraseña temporal: debe cambiarla otra vez');

select set_config('request.jwt.claims', current_setting('test.gestor'), true);

select results_eq(
  format($$ select accion from public.auditoria_usuarios where cuenta_id = %L order by id $$,
         current_setting('test.nueva')),
  $$ values ('creacion'::text), ('edicion'), ('desactivacion'), ('reactivacion'), ('contrasena_temporal') $$,
  'cada cambio de la cuenta queda en la auditoría, en orden'
);

reset role;

select * from finish();
rollback;
