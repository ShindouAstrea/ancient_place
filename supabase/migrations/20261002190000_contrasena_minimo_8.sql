-- =============================================================================
-- Largo mínimo de contraseña: de 12 a 8 caracteres.
--
-- Debe coincidir con Supabase Auth (config.toml en local; Dashboard en producción) y con
-- LARGO_MINIMO_CONTRASENA en la aplicación.
-- (create or replace conserva los permisos de ejecución existentes)
-- =============================================================================

-- Mismo mínimo que Supabase Auth (config.toml); 72 bytes es el máximo de bcrypt.
create or replace function privado.validar_contrasena(p_contrasena text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_contrasena is null or char_length(p_contrasena) < 8 or octet_length(p_contrasena) > 72 then
    raise exception 'contrasena_invalida' using errcode = '22023';
  end if;
end;
$$;
