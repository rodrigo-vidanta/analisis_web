-- ============================================
-- FIX: Activar is_operativo para ejecutivos activos
-- Fecha: 2026-02-04
-- Problema: 42 ejecutivos con is_operativo=false no ven conversaciones
-- NOTA: Migración a auth.users nativo completada 2026-01-20
-- ============================================

-- PASO 1: Activar is_operativo en auth.users.raw_user_meta_data
UPDATE auth.users
SET 
  raw_user_meta_data = jsonb_set(
    raw_user_meta_data,
    '{is_operativo}',
    'true'::jsonb
  ),
  updated_at = NOW()
WHERE id IN (
  SELECT u.id
  FROM user_profiles_v2 u
  WHERE u.is_ejecutivo = true
    AND u.is_operativo = false
    AND u.is_active = true
    AND EXISTS (
      SELECT 1 
      FROM prospectos p 
      WHERE p.ejecutivo_id = u.id
    )
);

-- PASO 2: Verificar que se aplicó correctamente
SELECT 
  COUNT(*) as ejecutivos_actualizados,
  COUNT(DISTINCT au.raw_user_meta_data->>'coordinacion_id') as coordinaciones
FROM auth.users au
WHERE au.raw_user_meta_data->>'is_ejecutivo' = 'true'
  AND au.raw_user_meta_data->>'is_operativo' = 'true'
  AND au.raw_user_meta_data->>'is_active' = 'true'
  AND EXISTS (
    SELECT 1 
    FROM prospectos p 
    WHERE p.ejecutivo_id = au.id
  );

-- PASO 3: Verificar usuarios que quedaron con is_operativo = false
-- (Solo deben ser usuarios sin prospectos asignados)
SELECT 
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.raw_user_meta_data->>'is_active' as is_active,
  au.last_sign_in_at as last_login,
  COUNT(p.id) as total_prospectos
FROM auth.users au
LEFT JOIN prospectos p ON p.ejecutivo_id = au.id
WHERE au.raw_user_meta_data->>'is_ejecutivo' = 'true'
  AND (au.raw_user_meta_data->>'is_operativo' = 'false' OR au.raw_user_meta_data->>'is_operativo' IS NULL)
GROUP BY au.id, au.email, au.raw_user_meta_data, au.last_sign_in_at
ORDER BY au.last_sign_in_at DESC NULLS LAST;
