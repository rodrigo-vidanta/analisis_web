-- ============================================
-- DIAGNÓSTICO: Usuarios con is_operativo = false
-- ============================================

-- 1. Buscar TODOS los usuarios ejecutivos con is_operativo = false
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role_name,
  u.is_operativo,
  u.is_active,
  u.last_login,
  c.nombre as coordinacion
FROM user_profiles_v2 u
LEFT JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE u.is_ejecutivo = true
  AND u.is_operativo = false
  AND u.is_active = true
ORDER BY u.last_login DESC;

-- 2. Verificar si tienen prospectos asignados
SELECT 
  u.email,
  u.full_name,
  COUNT(p.id) as total_prospectos
FROM user_profiles_v2 u
LEFT JOIN prospectos p ON p.ejecutivo_id = u.id
WHERE u.is_ejecutivo = true
  AND u.is_operativo = false
  AND u.is_active = true
GROUP BY u.id, u.email, u.full_name
HAVING COUNT(p.id) > 0;

-- 3. SOLUCIÓN: Activar is_operativo para ejecutivos activos que iniciaron sesión recientemente
-- NOTA: Solo ejecutar después de confirmar que estos usuarios SÍ deberían estar operativos
/*
UPDATE auth_users
SET is_operativo = true
WHERE id IN (
  SELECT u.id
  FROM user_profiles_v2 u
  WHERE u.is_ejecutivo = true
    AND u.is_operativo = false
    AND u.is_active = true
    AND u.last_login > NOW() - INTERVAL '7 days'
);
*/
