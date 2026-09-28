-- =============================================================================
-- Tests de seguridad (RLS, privilegios y funciones). Ejecutar con:  pnpm db:test
-- Todo corre dentro de una transacción que se revierte: no deja datos.
-- =============================================================================
begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

-- El test usa su propio secreto: reemplaza temporalmente el del seed (se revierte).
delete from vault.secrets where name = 'formulario_secreto';
select vault.create_secret('secreto-de-prueba-pgtap-0123456789abcdef', 'formulario_secreto');
-- Parámetro de sesión legible por cualquier rol, para usarlo tras cambiar de rol.
select set_config('test.secreto', 'secreto-de-prueba-pgtap-0123456789abcdef', true);

-- -----------------------------------------------------------------------------
-- Reglas globales
-- -----------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0,
  'RLS está habilitado en todas las tablas de public'
);

select is(
  (select count(*)::int
     from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'leads'
      and privilege_type = 'INSERT' and grantee in ('anon', 'authenticated'))
  + (select count(*)::int
       from information_schema.role_column_grants
      where table_schema = 'public' and table_name = 'leads'
        and privilege_type = 'INSERT' and grantee in ('anon', 'authenticated')),
  0,
  'Ningún rol de la aplicación tiene INSERT directo sobre leads'
);

-- -----------------------------------------------------------------------------
-- Rol anónimo (visitante del sitio / cualquiera con la clave publicable)
-- -----------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$ insert into public.leads (nombre, telefono, email, mensaje, consentimiento)
     values ('Directo', '+56912345678', 'x@example.com', 'Mensaje de prueba', true) $$,
  '42501', null,
  'anon: NO puede insertar leads directamente (solo vía crear_lead)'
);

select throws_ok(
  $$ select public.crear_lead(null, 'Sin Secreto', '+56912345678', 'x@example.com', null, 'Mensaje de prueba', true) $$,
  '42501', null,
  'crear_lead: rechaza la llamada sin secreto'
);

select throws_ok(
  $$ select public.crear_lead('secreto-incorrecto-secreto-incorrecto', 'Secreto Malo', '+56912345678',
                              'x@example.com', null, 'Mensaje de prueba', true) $$,
  '42501', null,
  'crear_lead: rechaza un secreto incorrecto'
);

select isnt(
  public.crear_lead(current_setting('test.secreto'), 'Visitante Test', '+56912345678',
                    'Visitante@Example.com', 'Hijo o hija', 'Mensaje de prueba', true),
  null,
  'crear_lead: con el secreto correcto crea el lead y devuelve su id'
);

select throws_ok(
  $$ select public.crear_lead(current_setting('test.secreto'), 'Sin Consentimiento', '+56912345678',
                              'x@example.com', null, 'Mensaje de prueba', false) $$,
  '23514', null,
  'crear_lead: rechaza un lead sin consentimiento'
);

select throws_ok(
  $$ select public.crear_lead(current_setting('test.secreto'), 'Telefono Malo', '12345',
                              'x@example.com', null, 'Mensaje de prueba', true) $$,
  '23514', null,
  'crear_lead: rechaza un teléfono con formato inválido'
);

select throws_ok(
  $$ select public.crear_lead(current_setting('test.secreto'), 'X', '+56912345678',
                              'x@example.com', null, repeat('a', 2001), true) $$,
  '23514', null,
  'crear_lead: rechaza un mensaje demasiado largo'
);

select throws_ok($$ select * from public.leads $$, '42501', null, 'anon: NO puede leer leads');
select throws_ok($$ update public.leads set estado = 'descartado' $$, '42501', null, 'anon: NO puede actualizar leads');
select throws_ok($$ delete from public.leads $$, '42501', null, 'anon: NO puede borrar leads');
select throws_ok($$ select * from public.admins $$, '42501', null, 'anon: NO puede leer admins');
select throws_ok($$ select * from public.rate_limits $$, '42501', null, 'anon: NO puede leer rate_limits');
select throws_ok($$ select public.is_admin() $$, '42501', null, 'anon: NO puede ejecutar is_admin()');
select throws_ok(
  $$ select privado.validar_secreto_formulario('x') $$,
  '42501', null,
  'anon: NO puede acceder al esquema privado'
);

-- Rate limit
select throws_ok(
  $$ select public.verificar_rate_limit('secreto-incorrecto-secreto-incorrecto', repeat('b', 64), 'contacto') $$,
  '42501', null,
  'rate limit: rechaza un secreto incorrecto'
);

select is(
  (select array_agg(public.verificar_rate_limit(current_setting('test.secreto'), repeat('b', 64), 'contacto') order by g)
     from generate_series(1, 6) as g),
  array[true, true, true, true, true, false],
  'rate limit: permite 5 envíos y bloquea el 6.º'
);

select throws_ok(
  $$ select public.verificar_rate_limit(current_setting('test.secreto'), '190.1.2.3', 'contacto') $$,
  '22023', null,
  'rate limit: rechaza una IP en texto plano (solo acepta hash)'
);

select throws_ok(
  $$ select public.verificar_rate_limit(current_setting('test.secreto'), repeat('c', 64), 'otra') $$,
  '22023', null,
  'rate limit: rechaza acciones no definidas'
);

reset role;

-- El lead creado por la función quedó con los valores que fija la base de datos.
select is(
  (select estado::text || '|' || email from public.leads where nombre = 'Visitante Test'),
  'nuevo|visitante@example.com',
  'crear_lead: estado inicial "nuevo" y correo normalizado a minúsculas'
);

-- -----------------------------------------------------------------------------
-- Usuario autenticado que NO es administrador
-- -----------------------------------------------------------------------------
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000ff","role":"authenticated"}',
  true
);

select is(public.is_admin(), false, 'no admin: is_admin() es false');
select is((select count(*)::int from public.leads), 0, 'no admin: no ve ningún lead');
select throws_ok(
  $$ insert into public.leads (nombre, telefono, email, mensaje, consentimiento)
     values ('Directo', '+56912345678', 'x@example.com', 'Mensaje de prueba', true) $$,
  '42501', null,
  'no admin: NO puede insertar leads directamente'
);
select throws_ok(
  $$ insert into public.admins (user_id, email)
     values ('00000000-0000-4000-8000-0000000000ff', 'intruso@example.com') $$,
  '42501', null,
  'no admin: NO puede registrarse como administrador'
);

reset role;

-- -----------------------------------------------------------------------------
-- Administrador (creado solo para este test)
-- -----------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000000aa',
        'authenticated', 'authenticated', 'admin-test@example.com');
insert into public.admins (user_id, email)
values ('00000000-0000-4000-8000-0000000000aa', 'admin-test@example.com');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000aa","role":"authenticated"}',
  true
);

select ok(public.is_admin(), 'admin: is_admin() es true');
select ok(
  (select count(*) from public.leads where email = 'visitante@example.com') = 1,
  'admin: puede leer leads'
);
select lives_ok(
  $$ update public.leads set estado = 'contactado' where email = 'visitante@example.com' $$,
  'admin: puede cambiar el estado de un lead'
);
select throws_ok(
  $$ update public.leads set nombre = 'Modificado' where email = 'visitante@example.com' $$,
  '42501', null,
  'admin: NO puede modificar datos del contacto (solo el estado)'
);
select throws_ok($$ delete from public.leads $$, '42501', null, 'admin: NO puede borrar leads');
select throws_ok(
  $$ update public.admins set email = 'otro@example.com' $$,
  '42501', null,
  'admin: NO puede modificar la tabla admins desde la aplicación'
);

reset role;

-- -----------------------------------------------------------------------------
-- Falla cerrada: sin secreto configurado en Vault, nadie puede crear leads.
-- -----------------------------------------------------------------------------
delete from vault.secrets where name = 'formulario_secreto';
set local role anon;
select throws_ok(
  $$ select public.crear_lead('cualquier-valor-cualquier-valor-123', 'Sin Vault', '+56912345678',
                              'x@example.com', null, 'Mensaje de prueba', true) $$,
  '55000', null,
  'crear_lead: sin secreto en Vault falla de forma cerrada'
);
select throws_ok(
  $$ select public.verificar_rate_limit('cualquier-valor-cualquier-valor-123', repeat('d', 64), 'contacto') $$,
  '55000', null,
  'rate limit: sin secreto en Vault falla de forma cerrada'
);
reset role;

select * from finish();
rollback;
