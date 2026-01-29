-- ============================================
-- SINCRONIZACIÓN MASIVA: Coordinacion_id para todos los coordinadores
-- ============================================
-- Fecha: 29 de Enero 2026
-- Propósito: Sincronizar coordinacion_id desde auth_user_coordinaciones a auth.users.raw_user_meta_data
-- para todos los coordinadores que tengan coordinacion_id = null

-- ============================================
-- PASO 1: Verificar coordinadores con coordinacion_id = null
-- ============================================

SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.raw_user_meta_data->>'role_name' as role_name,
  au.raw_user_meta_data->>'coordinacion_id' as coordinacion_id_actual,
  auc.coordinacion_id as coordinacion_id_correcto,
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo
FROM auth.users au
LEFT JOIN auth_user_coordinaciones auc ON au.id = auc.user_id
LEFT JOIN coordinaciones c ON c.id = auc.coordinacion_id
WHERE au.raw_user_meta_data->>'role_name' = 'coordinador'
  AND (au.raw_user_meta_data->>'coordinacion_id' IS NULL 
       OR au.raw_user_meta_data->>'coordinacion_id' = 'null')
ORDER BY au.email;

-- ============================================
-- PASO 2: Sincronizar coordinacion_id
-- ============================================

-- Actualizar todos los coordinadores que tienen coordinacion_id = null
-- usando la primera coordinación asignada en auth_user_coordinaciones

UPDATE auth.users au
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{coordinacion_id}',
  to_jsonb(auc.coordinacion_id)
)
FROM (
  -- Obtener la primera coordinación asignada para cada coordinador
  -- (en caso de tener múltiples coordinaciones, usar la más reciente)
  SELECT DISTINCT ON (user_id) user_id, coordinacion_id
  FROM auth_user_coordinaciones
  ORDER BY user_id, assigned_at DESC
) auc
WHERE au.id = auc.user_id
  AND au.raw_user_meta_data->>'role_name' = 'coordinador'
  AND (au.raw_user_meta_data->>'coordinacion_id' IS NULL 
       OR au.raw_user_meta_data->>'coordinacion_id' = 'null');

-- ============================================
-- PASO 3: Verificar actualización
-- ============================================

SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.raw_user_meta_data->>'role_name' as role_name,
  au.raw_user_meta_data->>'coordinacion_id' as coordinacion_id_actualizado,
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo
FROM auth.users au
LEFT JOIN coordinaciones c ON c.id = (au.raw_user_meta_data->>'coordinacion_id')::uuid
WHERE au.raw_user_meta_data->>'role_name' = 'coordinador'
ORDER BY au.email;

-- ============================================
-- PASO 4: Verificar que no queden coordinadores sin coordinacion_id
-- ============================================

SELECT 
  COUNT(*) as coordinadores_sin_coordinacion_id
FROM auth.users au
WHERE au.raw_user_meta_data->>'role_name' = 'coordinador'
  AND (au.raw_user_meta_data->>'coordinacion_id' IS NULL 
       OR au.raw_user_meta_data->>'coordinacion_id' = 'null');

-- Si el resultado es 0, la sincronización fue exitosa

-- ============================================
-- NOTAS TÉCNICAS
-- ============================================
--
-- Este script:
-- 1. Identifica coordinadores con coordinacion_id = null
-- 2. Actualiza su coordinacion_id usando la coordinación de auth_user_coordinaciones
-- 3. Verifica que la actualización fue exitosa
--
-- Importante:
-- - Si un coordinador tiene múltiples coordinaciones, se usa la más reciente (assigned_at DESC)
-- - Después de ejecutar este script, los usuarios deben cerrar sesión y volver a iniciar sesión
--
-- Prevención:
-- - Agregar validación en UserManagement.tsx para asegurar que coordinacion_id no sea null
-- - Ejecutar este script periódicamente como mantenimiento preventivo
--
-- ============================================
