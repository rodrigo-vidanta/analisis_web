-- ============================================
-- RESETEAR is_operativo PARA TODOS LOS USUARIOS
-- ============================================
-- 
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Fecha: 30 Enero 2026
-- 
-- Este script establece is_operativo = false para TODOS los usuarios
-- Ya que actualmente no tenemos forma de detectar sesiones activas
-- de forma confiable (tabla active_sessions no existe en public)
--
-- ⚠️ NOTA: Los usuarios se marcarán como "en línea" automáticamente
-- cuando inicien sesión (lógica implementada en authService.login())
--
-- ============================================

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_operativo}',
  'false'::jsonb
);

-- Ver resultado
SELECT 
  COUNT(*) as total_usuarios_actualizados,
  COUNT(CASE WHEN raw_user_meta_data->>'is_operativo' = 'false' THEN 1 END) as usuarios_marcados_offline
FROM auth.users;
