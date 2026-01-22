-- ============================================
-- FIX: Actualizar coordinacion_id en auth.users metadata
-- ============================================
-- 
-- Problema: Después de la migración a auth.users nativo, algunos
-- usuarios no tienen coordinacion_id en raw_user_meta_data
-- 
-- Impacto: scheduledCallsService no puede mostrar llamadas programadas
-- porque la verificación de permisos falla al no encontrar coordinacion_id
-- 
-- Solución: Copiar coordinacion_id desde auth_user_coordinaciones
-- a auth.users.raw_user_meta_data
-- 
-- Fecha: 2026-01-22
-- ============================================

-- 1. DIAGNÓSTICO: Identificar usuarios sin coordinacion_id en metadata
SELECT 
  au.id,
  au.email,
  (au.raw_user_meta_data->>'full_name')::TEXT as full_name,
  ar.name as role_name,
  (au.raw_user_meta_data->>'coordinacion_id')::UUID as metadata_coord_id,
  auc.coordinacion_id as table_coord_id,
  CASE 
    WHEN (au.raw_user_meta_data->>'coordinacion_id') IS NULL AND auc.coordinacion_id IS NOT NULL 
    THEN '⚠️ FALTA EN METADATA'
    WHEN (au.raw_user_meta_data->>'coordinacion_id') IS NOT NULL AND auc.coordinacion_id IS NOT NULL 
    THEN '✅ OK'
    WHEN auc.coordinacion_id IS NULL 
    THEN '❌ SIN COORDINACION'
    ELSE '❓ DESCONOCIDO'
  END as status
FROM auth.users au
LEFT JOIN auth_roles ar ON ar.id = (au.raw_user_meta_data->>'role_id')::UUID
LEFT JOIN auth_user_coordinaciones auc ON auc.user_id = au.id
WHERE ar.name IN ('ejecutivo', 'coordinador', 'admin', 'administrador_operativo')
  AND au.deleted_at IS NULL
ORDER BY 
  CASE 
    WHEN (au.raw_user_meta_data->>'coordinacion_id') IS NULL AND auc.coordinacion_id IS NOT NULL THEN 1
    ELSE 2
  END,
  ar.name, 
  au.email;

-- 2. FIX: Actualizar metadata para usuarios con coordinacion_id en tabla pero no en metadata
DO $$
DECLARE
  v_user_record RECORD;
  v_updated_count INTEGER := 0;
  v_metadata JSONB;
BEGIN
  RAISE NOTICE '🔧 Iniciando actualización de coordinacion_id en metadata...';
  
  -- Iterar sobre usuarios que necesitan actualización
  FOR v_user_record IN 
    SELECT 
      au.id,
      au.email,
      au.raw_user_meta_data,
      auc.coordinacion_id
    FROM auth.users au
    LEFT JOIN auth_roles ar ON ar.id = (au.raw_user_meta_data->>'role_id')::UUID
    LEFT JOIN auth_user_coordinaciones auc ON auc.user_id = au.id
    WHERE ar.name IN ('ejecutivo', 'coordinador', 'admin', 'administrador_operativo')
      AND (au.raw_user_meta_data->>'coordinacion_id') IS NULL
      AND auc.coordinacion_id IS NOT NULL
      AND au.deleted_at IS NULL
  LOOP
    -- Construir metadata actualizado
    v_metadata := v_user_record.raw_user_meta_data;
    v_metadata := jsonb_set(v_metadata, '{coordinacion_id}', to_jsonb(v_user_record.coordinacion_id::TEXT));
    
    -- Actualizar auth.users
    UPDATE auth.users 
    SET raw_user_meta_data = v_metadata,
        updated_at = NOW()
    WHERE id = v_user_record.id;
    
    v_updated_count := v_updated_count + 1;
    RAISE NOTICE '✅ Actualizado: % (coordinacion_id: %)', v_user_record.email, v_user_record.coordinacion_id;
  END LOOP;
  
  RAISE NOTICE '✅ Actualizados % usuarios', v_updated_count;
END $$;

-- 3. VERIFICACIÓN: Confirmar que todos los usuarios tienen coordinacion_id
SELECT 
  COUNT(*) FILTER (WHERE metadata_coord_id IS NULL AND table_coord_id IS NOT NULL) as faltantes,
  COUNT(*) FILTER (WHERE metadata_coord_id IS NOT NULL) as con_metadata,
  COUNT(*) FILTER (WHERE table_coord_id IS NULL) as sin_coordinacion
FROM (
  SELECT 
    au.id,
    (au.raw_user_meta_data->>'coordinacion_id')::UUID as metadata_coord_id,
    auc.coordinacion_id as table_coord_id
  FROM auth.users au
  LEFT JOIN auth_roles ar ON ar.id = (au.raw_user_meta_data->>'role_id')::UUID
  LEFT JOIN auth_user_coordinaciones auc ON auc.user_id = au.id
  WHERE ar.name IN ('ejecutivo', 'coordinador', 'admin', 'administrador_operativo')
    AND au.deleted_at IS NULL
) subquery;

-- 4. CASO ESPECÍFICO: Diego Barba (el ejecutivo del bug reportado)
SELECT 
  au.id,
  au.email,
  (au.raw_user_meta_data->>'full_name')::TEXT as full_name,
  ar.name as role_name,
  (au.raw_user_meta_data->>'coordinacion_id')::UUID as metadata_coord_id,
  auc.coordinacion_id as table_coord_id,
  CASE 
    WHEN (au.raw_user_meta_data->>'coordinacion_id') IS NOT NULL 
    THEN '✅ CORREGIDO'
    ELSE '❌ FALTA'
  END as status
FROM auth.users au
LEFT JOIN auth_roles ar ON ar.id = (au.raw_user_meta_data->>'role_id')::UUID
LEFT JOIN auth_user_coordinaciones auc ON auc.user_id = au.id
WHERE au.id = '5b8852ef-ae60-4b82-a7aa-bc4f98ee1654';

-- 5. TEST: Verificar que user_profiles_v2 ahora muestra coordinacion_id
SELECT 
  id,
  full_name,
  email,
  role_name,
  coordinacion_id,
  CASE 
    WHEN coordinacion_id IS NOT NULL THEN '✅ OK'
    ELSE '❌ FALTA'
  END as status
FROM user_profiles_v2
WHERE id IN (
  '5b8852ef-ae60-4b82-a7aa-bc4f98ee1654',  -- Diego Barba
  '2513037a-6739-46ff-93a6-c995e7324309'   -- Irving Aquino
)
ORDER BY email;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- 1. Este script debe ejecutarse con permisos de service_role
-- 2. Modifica auth.users (tabla del esquema auth de Supabase)
-- 3. Solo actualiza usuarios que:
--    - Tienen rol ejecutivo/coordinador/admin
--    - Tienen coordinacion_id en auth_user_coordinaciones
--    - NO tienen coordinacion_id en raw_user_meta_data
-- 4. NO modifica usuarios que ya tienen coordinacion_id en metadata
-- 5. NO modifica usuarios sin coordinacion_id en la tabla
-- 
-- ============================================
