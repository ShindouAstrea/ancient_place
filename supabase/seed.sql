-- =============================================================================
-- Datos de prueba para DESARROLLO LOCAL. Se cargan con `pnpm db:reset`.
-- Todos los datos son ficticios. Este archivo NUNCA se aplica en producción
-- (`supabase db push` no ejecuta el seed).
-- =============================================================================

-- Secreto compartido entre el servidor Next y las funciones crear_lead() /
-- verificar_rate_limit(). Este valor es SOLO PARA DESARROLLO LOCAL y coincide con
-- SUPABASE_FORMULARIO_SECRETO de .env.example. En producción se crea uno distinto
-- y aleatorio desde el SQL Editor (ver README).
select vault.create_secret(
  'local-dev-secreto-formulario-no-usar-en-produccion',
  'formulario_secreto',
  'Secreto compartido servidor Next <-> RPC del formulario de contacto'
);

insert into public.leads
  (nombre, telefono, email, parentesco, mensaje, consentimiento, estado, created_at)
values
  ('María Fernanda Soto', '+56911111111', 'maria.soto@example.com', 'Hijo o hija',
   'Quisiera información sobre valores y disponibilidad para mi madre de 82 años.',
   true, 'nuevo', now() - interval '2 hours'),
  ('Jorge Valenzuela', '+56922222222', 'jorge.v@example.com', 'Nieto o nieta',
   'Mi abuelo necesita apoyo con kinesiología. ¿Tienen cupos para el próximo mes?',
   true, 'nuevo', now() - interval '1 day'),
  ('Carolina Muñoz', '+56223456789', 'carolina.munoz@example.com', null,
   '¿Cuál es el horario de visitas los fines de semana?',
   true, 'contactado', now() - interval '3 days'),
  ('Pedro Rojas', '+56933333333', 'pedro.rojas@example.com', 'Cónyuge o pareja',
   'Busco un hogar para mi esposa con dependencia moderada. ¿Podemos agendar una visita?',
   true, 'contactado', now() - interval '6 days'),
  ('Ana Contreras', '+56944444444', 'ana.contreras@example.com', 'Otro familiar',
   'Consulta enviada por error, disculpen las molestias.',
   true, 'descartado', now() - interval '10 days');

-- -----------------------------------------------------------------------------
-- Administrador de prueba (SOLO LOCAL):
--   correo:     admin@example.com
--   contraseña: admin-local-12345
-- La contraseña se guarda con bcrypt, igual que lo hace Supabase Auth.
-- -----------------------------------------------------------------------------
do $$
declare
  v_id uuid := '00000000-0000-4000-8000-000000000001';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    'admin@example.com', extensions.crypt('admin-local-12345', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text, 'email',
    jsonb_build_object('sub', v_id::text, 'email', 'admin@example.com', 'email_verified', true),
    now(), now(), now()
  );

  insert into public.admins (user_id, email) values (v_id, 'admin@example.com');
  -- Ambos roles: gestiona el sitio web y (a futuro) los pacientes.
  insert into public.admin_roles (user_id, rol) values (v_id, 'sitio'), (v_id, 'pacientes');
end;
$$;

-- -----------------------------------------------------------------------------
-- Contenido del sitio de EJEMPLO (ficticio, solo local). En producción se completa
-- desde el panel: /admin/sitio.
-- -----------------------------------------------------------------------------
update public.configuracion_sitio set
  nombre = 'Hogar Los Aromos (ejemplo)',
  descripcion_corta = 'Hogar de reposo para adultos mayores con cuidado las 24 horas.',
  whatsapp = '+56911112222',
  telefono = '+56911112222',
  email_contacto = 'contacto@example.com',
  email_notificaciones = 'avisos@example.com',
  email_remitente = 'Sitio web <onboarding@resend.dev>',
  direccion = 'Av. Ejemplo 1234',
  ciudad = 'Santiago',
  region = 'Región Metropolitana',
  horario_visitas = 'Lunes a domingo de 10:00 a 18:00',
  hero_subtitulo = 'Atención profesional las 24 horas en un ambiente tranquilo, cálido y seguro.',
  nosotros_texto = E'Somos un hogar familiar dedicado al cuidado de adultos mayores.\n\nTrabajamos con respeto, cercanía y comunicación permanente con las familias.',
  destacados = '[{"valor": "10", "etiqueta": "años de experiencia"}, {"valor": "24/7", "etiqueta": "atención y supervisión"}]',
  servicios_intro = 'Todo lo que tu familiar necesita para vivir tranquilo y bien acompañado.';

insert into public.servicios (titulo, descripcion, icono, orden) values
  ('Cuidado 24/7', 'Personal presente día y noche.', 'HeartHandshake', 0),
  ('Enfermería', 'Control de signos vitales y administración de medicamentos.', 'Stethoscope', 1),
  ('Alimentación supervisada', 'Menús equilibrados y adaptados a cada residente.', 'Utensils', 2);

insert into public.razones (titulo, descripcion, icono, orden) values
  ('Ambiente de hogar', 'Espacios tranquilos y acogedores.', 'House', 0),
  ('Comunicación con las familias', 'Te mantenemos informado sobre tu familiar.', 'HeartPulse', 1);

insert into public.testimonios (texto, autor, relacion, orden) values
  ('Testimonio de ejemplo: el trato con mi mamá ha sido excelente.', 'M. S.', 'hija de residente', 0);

insert into public.preguntas_frecuentes (pregunta, respuesta, orden) values
  ('¿Cuál es el horario de visitas?', 'Lunes a domingo de 10:00 a 18:00, sin aviso previo.', 0),
  ('¿Qué incluye la mensualidad?', 'Respuesta de ejemplo: alojamiento, alimentación y cuidados.', 1);
