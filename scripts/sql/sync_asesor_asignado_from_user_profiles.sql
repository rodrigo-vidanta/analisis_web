-- ============================================
-- SINCRONIZACIÓN: asesor_asignado desde user_profiles_v2
-- ============================================
-- Fecha: 2026-01-24
-- Propósito: Actualizar el campo legacy 'asesor_asignado' en la tabla 'prospectos'
--            con los datos reales de 'user_profiles_v2' (vista de auth.users nativo de Supabase)
-- 
-- IMPORTANTE: Este script sincroniza el nombre del ejecutivo desde la fuente de verdad
--             (user_profiles_v2) hacia el campo legacy para mantener consistencia.
-- ============================================

-- 1. BACKUP: Crear tabla de respaldo antes de modificar
CREATE TABLE IF NOT EXISTS prospectos_asesor_backup_20260124 AS
SELECT id, ejecutivo_id, asesor_asignado, updated_at
FROM prospectos
WHERE ejecutivo_id IS NOT NULL;

-- Verificar cuántos registros se respaldaron
SELECT 
    'Registros respaldados' as status,
    COUNT(*) as total
FROM prospectos_asesor_backup_20260124;

-- 2. DIAGNÓSTICO: Ver cuántos registros necesitan actualización
SELECT 
    'Diagnóstico de sincronización' as status,
    COUNT(*) FILTER (WHERE p.ejecutivo_id IS NOT NULL) as prospectos_con_ejecutivo_id,
    COUNT(*) FILTER (WHERE p.asesor_asignado IS NOT NULL AND p.asesor_asignado != '') as prospectos_con_asesor_asignado,
    COUNT(*) FILTER (WHERE p.ejecutivo_id IS NOT NULL AND (p.asesor_asignado IS NULL OR p.asesor_asignado = '')) as falta_asesor_asignado,
    COUNT(*) FILTER (WHERE p.ejecutivo_id IS NOT NULL AND u.full_name IS NOT NULL AND p.asesor_asignado != u.full_name) as asesor_desincronizado
FROM prospectos p
LEFT JOIN user_profiles_v2 u ON p.ejecutivo_id = u.id;

-- 3. ACTUALIZACIÓN: Sincronizar asesor_asignado desde user_profiles_v2
-- Solo actualiza registros donde:
--   a) ejecutivo_id existe
--   b) El usuario existe en user_profiles_v2
--   c) El asesor_asignado está vacío O es diferente al full_name actual
UPDATE prospectos p
SET 
    asesor_asignado = u.full_name,
    updated_at = NOW()
FROM user_profiles_v2 u
WHERE p.ejecutivo_id = u.id
  AND u.full_name IS NOT NULL
  AND u.full_name != ''
  AND (
      p.asesor_asignado IS NULL 
      OR p.asesor_asignado = '' 
      OR p.asesor_asignado != u.full_name
  );

-- Verificar cuántos registros se actualizaron
SELECT 
    'Registros actualizados' as status,
    COUNT(*) as total
FROM prospectos p
JOIN user_profiles_v2 u ON p.ejecutivo_id = u.id
WHERE p.asesor_asignado = u.full_name;

-- 4. VERIFICACIÓN: Mostrar registros que aún no tienen asesor_asignado
SELECT 
    'Registros sin sincronizar (ejecutivo_id sin match en user_profiles_v2)' as status,
    p.id as prospecto_id,
    p.nombre_completo,
    p.ejecutivo_id,
    p.asesor_asignado
FROM prospectos p
WHERE p.ejecutivo_id IS NOT NULL
  AND (p.asesor_asignado IS NULL OR p.asesor_asignado = '')
  AND NOT EXISTS (SELECT 1 FROM user_profiles_v2 u WHERE u.id = p.ejecutivo_id)
LIMIT 20;

-- 5. RESUMEN FINAL
SELECT 
    'Resumen final' as status,
    COUNT(*) as total_prospectos,
    COUNT(*) FILTER (WHERE ejecutivo_id IS NOT NULL) as con_ejecutivo_id,
    COUNT(*) FILTER (WHERE asesor_asignado IS NOT NULL AND asesor_asignado != '') as con_asesor_asignado,
    COUNT(*) FILTER (WHERE ejecutivo_id IS NOT NULL AND (asesor_asignado IS NULL OR asesor_asignado = '')) as pendientes
FROM prospectos;

-- ============================================
-- NOTAS:
-- - Este script es idempotente (se puede ejecutar múltiples veces sin efectos adversos)
-- - La tabla de backup se crea con fecha para referencia
-- - El campo updated_at se actualiza para tracking de cambios
-- - Los prospectos sin match en user_profiles_v2 no se modifican
-- ============================================
