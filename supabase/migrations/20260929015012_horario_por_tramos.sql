-- =============================================================================
-- Horario de visitas por tramos (ej: lunes a viernes de 10:00 a 18:00).
--
-- Hasta ahora el horario era solo texto libre, que los buscadores no pueden
-- interpretar. Los tramos alimentan el horario que muestra el sitio y los datos
-- estructurados (JSON-LD) para Google. El texto libre (horario_visitas) se mantiene
-- como aclaración opcional (ej: "Festivos, con aviso previo").
--
-- Formato: [{"dias": [1, 2, 3, 4, 5], "desde": "10:00", "hasta": "18:00"}]
--   dias: 1 = lunes … 7 = domingo (ISO 8601); horas en formato 24 h. Máximo 3 tramos.
-- =============================================================================

alter table public.configuracion_sitio
  add column horario_tramos jsonb not null default '[]'
  constraint horario_tramos_valido check (
    jsonb_typeof(horario_tramos) = 'array'
    and jsonb_array_length(horario_tramos) <= 3
    -- Cada tramo: objeto con horas HH:MM válidas, "desde" antes de "hasta" y de 1 a 7 días.
    and not jsonb_path_exists(horario_tramos, '$[*] ? (
      @.type() != "object"
      || !(@.desde like_regex "^([01][0-9]|2[0-3]):[0-5][0-9]$")
      || !(@.hasta like_regex "^([01][0-9]|2[0-3]):[0-5][0-9]$")
      || @.desde >= @.hasta
      || !exists(@.dias)
      || @.dias.type() != "array"
      || @.dias.size() < 1
      || @.dias.size() > 7
    )')
    -- Cada día: número entero de 1 a 7.
    and not jsonb_path_exists(horario_tramos, '$[*].dias[*] ? (
      @.type() != "number" || @ < 1 || @ > 7 || @ != @.floor()
    )')
  );

-- Mismo permiso que el resto de las columnas editables (la política RLS de UPDATE ya
-- exige el rol "sitio").
grant update (horario_tramos) on table public.configuracion_sitio to authenticated;
