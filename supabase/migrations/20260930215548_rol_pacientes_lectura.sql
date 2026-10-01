-- =============================================================================
-- Nuevo nivel de acceso a las fichas de pacientes: "pacientes_lectura" (solo ver).
--
--   - "pacientes":          ver y editar fichas (enfermería, administración).
--   - "pacientes_lectura":  solo ver fichas (ej: cuidadores que escanean el QR).
--
-- Va en su propia migración: un valor nuevo de un enum no puede usarse en la misma
-- transacción en que se crea, y la migración siguiente lo usa en las políticas RLS.
-- =============================================================================

alter type public.rol_admin add value if not exists 'pacientes_lectura';
