-- =============================================================================
-- Nuevo rol del panel: "usuarios" (crear cuentas, asignar roles, desactivarlas y dar
-- contraseñas temporales, desde /admin/usuarios).
--
-- Va en su propia migración: un valor nuevo de un enum no puede usarse en la misma
-- transacción en que se crea, y la migración siguiente lo usa en las funciones y políticas.
-- =============================================================================

alter type public.rol_admin add value if not exists 'usuarios';
