-- =============================================================================
-- Rate limit para "¿Olvidaste tu contraseña?" (acción "recuperacion").
--
-- Cada solicitud envía un correo desde Supabase Auth, cuyo cupo de envíos es
-- compartido por todo el proyecto. Este límite, por hash de la IP del visitante,
-- evita que una sola persona lo agote (y bloquee la recuperación de los
-- administradores) o lo use para sondear qué correos tienen cuenta.
--
-- Solo se agrega el caso 'recuperacion'; el resto de la función no cambia.
-- =============================================================================

create or replace function public.verificar_rate_limit(p_secreto text, p_ip_hash text, p_accion text)
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
    when 'login' then
      v_limite  := 10;
      v_ventana := interval '1 hour';
    when 'recuperacion' then
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

-- create or replace conserva los permisos existentes; se reafirman por claridad.
revoke execute on function public.verificar_rate_limit(text, text, text) from public;
grant execute on function public.verificar_rate_limit(text, text, text) to anon, authenticated;
