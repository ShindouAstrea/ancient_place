-- =============================================================================
-- Capa extra de seguridad para el formulario de contacto.
--
-- Problema: la clave publicable de Supabase es pública. Con un INSERT directo
-- permitido al rol `anon`, cualquiera podría llamar a la API REST de Supabase y
-- crear leads saltándose Turnstile y el rate limit (que viven en el servidor Next).
--
-- Solución:
--   1. Se elimina el INSERT directo sobre `leads` para anon/authenticated.
--   2. Los leads solo se crean mediante la función `crear_lead()`, que exige un
--      secreto compartido guardado en Supabase Vault y conocido únicamente por el
--      servidor Next (variable de runtime SUPABASE_FORMULARIO_SECRETO).
--   3. `verificar_rate_limit()` también exige el secreto, para que nadie pueda
--      llenar la tabla rate_limits llamándola directamente.
--
-- El secreto NO está en este archivo (el repositorio no debe contener secretos):
-- se crea en cada entorno con vault.create_secret(). Ver README.
-- Sin secreto configurado, las funciones fallan de forma cerrada (fail closed).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Esquema privado: NO expuesto por la API (config.toml solo expone "public").
-- Además se revoca el acceso a los roles de la aplicación.
-- -----------------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

-- Valida el secreto compartido. Lanza error si no coincide o no está configurado.
-- Se compara el hash SHA-256 de ambos valores para no depender de una
-- comparación de texto que se detiene en el primer carácter distinto.
create function privado.validar_secreto_formulario(p_secreto text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_esperado text;
begin
  select decrypted_secret
    into v_esperado
    from vault.decrypted_secrets
   where name = 'formulario_secreto'
   limit 1;

  if v_esperado is null or char_length(v_esperado) < 32 then
    raise exception 'Secreto del formulario no configurado en Vault'
      using errcode = '55000';
  end if;

  if p_secreto is null
     or extensions.digest(p_secreto, 'sha256') <> extensions.digest(v_esperado, 'sha256') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function privado.validar_secreto_formulario(text) from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 1. Sin INSERT directo sobre leads.
-- -----------------------------------------------------------------------------
drop policy "leads: cualquiera puede crear con consentimiento" on public.leads;

revoke insert (nombre, telefono, email, parentesco, mensaje, consentimiento)
  on table public.leads from anon, authenticated;
revoke insert on table public.leads from anon, authenticated;


-- -----------------------------------------------------------------------------
-- 2. crear_lead(): única vía para crear un lead desde la aplicación.
-- SECURITY DEFINER: se ejecuta con los permisos del dueño de la tabla, por eso
-- valida el secreto ANTES de cualquier otra cosa. Las restricciones CHECK de la
-- tabla siguen aplicándose (formato de teléfono, largos, consentimiento).
-- -----------------------------------------------------------------------------
create function public.crear_lead(
  p_secreto        text,
  p_nombre         text,
  p_telefono       text,
  p_email          text,
  p_parentesco     text,
  p_mensaje        text,
  p_consentimiento boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform privado.validar_secreto_formulario(p_secreto);

  if p_consentimiento is distinct from true then
    raise exception 'Se requiere consentimiento' using errcode = '23514';
  end if;

  -- id, estado, fecha_consentimiento, created_at y updated_at: valores por defecto.
  insert into public.leads (nombre, telefono, email, parentesco, mensaje, consentimiento)
  values (p_nombre, p_telefono, lower(p_email), nullif(p_parentesco, ''), p_mensaje, true)
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.crear_lead(text, text, text, text, text, text, boolean) is
  'Crea un lead. Requiere el secreto compartido del servidor (Vault: formulario_secreto).';

revoke execute on function public.crear_lead(text, text, text, text, text, text, boolean) from public;
grant execute on function public.crear_lead(text, text, text, text, text, text, boolean)
  to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 3. verificar_rate_limit(): misma lógica, ahora exige el secreto.
-- -----------------------------------------------------------------------------
drop function public.verificar_rate_limit(text, text);

create function public.verificar_rate_limit(p_secreto text, p_ip_hash text, p_accion text)
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
  perform privado.validar_secreto_formulario(p_secreto);

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

  -- Limpieza oportunista (minimización de datos).
  delete from public.rate_limits
  where ventana_inicio < now() - interval '1 day';

  return v_contador <= v_limite;
end;
$$;

comment on function public.verificar_rate_limit(text, text, text) is
  'Registra un intento para (hash de IP, acción) y devuelve true si está dentro del límite. Requiere el secreto del servidor.';

revoke execute on function public.verificar_rate_limit(text, text, text) from public;
grant execute on function public.verificar_rate_limit(text, text, text) to anon, authenticated;
