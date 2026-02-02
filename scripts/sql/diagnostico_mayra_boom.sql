-- ============================================
-- DIAGNÓSTICO COMPLETO: Mayra González - Permisos BOOM
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Usuario: mayragonzalezs@vidavacations.com
-- Problema: Ve leads de BOOM cuando solo debería ver VEN

-- ============================================
-- SECCIÓN 1: INFORMACIÓN BÁSICA DEL USUARIO
-- ============================================

SELECT 
  '=== INFORMACIÓN BÁSICA DEL USUARIO ===' as seccion;

SELECT 
  u.id,
  u.email,
  u.full_name,
  r.name as role_name,
  u.is_coordinador,
  u.is_ejecutivo,
  u.is_operativo,
  u.is_active,
  u.coordinacion_id,
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo,
  u.backup_id,
  u.has_backup,
  CASE 
    WHEN u.backup_id IS NOT NULL THEN (SELECT email FROM auth_users WHERE id = u.backup_id)
    ELSE NULL
  END as backup_email
FROM auth_users u
LEFT JOIN auth_roles r ON u.role_id = r.id
LEFT JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE u.email = 'mayragonzalezs@vidavacations.com';

-- ============================================
-- SECCIÓN 2: COORDINACIONES ASIGNADAS
-- ============================================

SELECT 
  '=== COORDINACIONES ASIGNADAS (auth_user_coordinaciones) ===' as seccion;

SELECT 
  uc.user_id,
  c.id as coordinacion_id,
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo,
  uc.assigned_at,
  uc.assigned_by,
  CASE 
    WHEN uc.assigned_by IS NOT NULL THEN (SELECT email FROM auth_users WHERE id = uc.assigned_by)
    ELSE NULL
  END as assigned_by_email
FROM auth_user_coordinaciones uc
JOIN coordinaciones c ON uc.coordinacion_id = c.id
WHERE uc.user_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
ORDER BY uc.assigned_at DESC;

-- ============================================
-- SECCIÓN 3: PERMISOS DEL USUARIO
-- ============================================

SELECT 
  '=== PERMISOS DEL USUARIO ===' as seccion;

SELECT 
  p.permission_name,
  p.description,
  p.module_name,
  p.permission_type,
  p.is_granted
FROM auth_user_permissions up
JOIN permissions p ON up.permission_id = p.id
WHERE up.user_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
);

-- ============================================
-- SECCIÓN 4: PROSPECTOS DE BOOM ASIGNADOS A ELLA
-- ============================================

SELECT 
  '=== PROSPECTOS DE BOOM ASIGNADOS A MAYRA ===' as seccion;

SELECT 
  p.id,
  p.nombre,
  p.whatsapp,
  p.etapa_id,
  p.coordinacion_id,
  c.codigo as coordinacion_codigo,
  p.ejecutivo_id,
  p.created_at,
  p.updated_at
FROM prospectos p
JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE p.ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'BOOM'
ORDER BY p.updated_at DESC
LIMIT 20;

-- ============================================
-- SECCIÓN 5: EJECUTIVOS DE BOOM DONDE ES BACKUP
-- ============================================

SELECT 
  '=== EJECUTIVOS DE BOOM DONDE MAYRA ES BACKUP ===' as seccion;

SELECT 
  u.id,
  u.email,
  u.full_name,
  c.codigo as coordinacion_codigo,
  u.backup_id,
  u.has_backup,
  (SELECT COUNT(*) FROM prospectos WHERE ejecutivo_id = u.id) as total_prospectos
FROM auth_users u
JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE u.backup_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'BOOM';

-- ============================================
-- SECCIÓN 6: INFORMACIÓN DE LA COORDINACIÓN BOOM
-- ============================================

SELECT 
  '=== INFORMACIÓN DE LA COORDINACIÓN BOOM ===' as seccion;

SELECT 
  id,
  nombre,
  codigo,
  is_operativo,
  archivado,
  created_at
FROM coordinaciones
WHERE codigo ILIKE '%BOOM%' OR nombre ILIKE '%BOOM%';

-- ============================================
-- SECCIÓN 7: TOTAL DE LEADS POR COORDINACIÓN DE MAYRA
-- ============================================

SELECT 
  '=== TOTAL DE LEADS POR COORDINACIÓN ===' as seccion;

SELECT 
  c.codigo as coordinacion_codigo,
  COUNT(*) as total_leads
FROM prospectos p
JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE p.ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
GROUP BY c.codigo
ORDER BY total_leads DESC;

-- ============================================
-- SECCIÓN 8: VERIFICAR SI ES COORDINADOR DE CALIDAD
-- ============================================

SELECT 
  '=== VERIFICAR SI ES COORDINADOR DE CALIDAD ===' as seccion;

SELECT 
  c.codigo,
  c.nombre,
  uc.assigned_at
FROM auth_user_coordinaciones uc
JOIN coordinaciones c ON uc.coordinacion_id = c.id
WHERE uc.user_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'CALIDAD';

-- ============================================
-- SECCIÓN 9: RESUMEN FINAL
-- ============================================

SELECT 
  '=== RESUMEN FINAL ===' as seccion;

WITH mayra_data AS (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
SELECT 
  (SELECT COUNT(*) FROM auth_user_coordinaciones WHERE user_id IN (SELECT id FROM mayra_data)) as coordinaciones_asignadas,
  (SELECT COUNT(*) FROM prospectos WHERE ejecutivo_id IN (SELECT id FROM mayra_data)) as total_prospectos_asignados,
  (SELECT COUNT(*) FROM prospectos p JOIN coordinaciones c ON p.coordinacion_id = c.id WHERE p.ejecutivo_id IN (SELECT id FROM mayra_data) AND c.codigo = 'BOOM') as prospectos_boom,
  (SELECT COUNT(*) FROM auth_users WHERE backup_id IN (SELECT id FROM mayra_data)) as ejecutivos_donde_es_backup,
  (SELECT c.codigo FROM auth_users u JOIN coordinaciones c ON u.coordinacion_id = c.id WHERE u.id IN (SELECT id FROM mayra_data)) as coordinacion_principal;
