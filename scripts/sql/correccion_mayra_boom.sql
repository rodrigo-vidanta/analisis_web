-- ============================================
-- CORRECCIONES: Mayra González - Permisos BOOM
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Usuario: mayragonzalezs@vidavacations.com
-- Problema: Ve leads de BOOM cuando solo debería ver VEN
--
-- ⚠️ IMPORTANTE: Ejecutar primero diagnostico_mayra_boom.sql
--                para identificar la causa exacta antes de aplicar correcciones

-- ============================================
-- VALORES DE REFERENCIA
-- ============================================
-- VEN UUID: 3f41a10b-60b1-4c2b-b097-a83968353af5
-- BOOM UUID: (consultar en diagnostico)
-- Ejecutivo role UUID: fed8bd96-7928-4a3e-bb20-e20384e98f0b

-- ============================================
-- CORRECCIÓN 1: Fijar coordinacion_id principal a VEN
-- ============================================
-- Aplicar si: auth_users.coordinacion_id apunta a BOOM o es NULL

-- UNCOMMENT para ejecutar:
/*
UPDATE auth_users
SET 
  coordinacion_id = '3f41a10b-60b1-4c2b-b097-a83968353af5', -- VEN
  updated_at = NOW()
WHERE email = 'mayragonzalezs@vidavacations.com';

SELECT 'Coordinación principal actualizada a VEN' as resultado;
*/

-- ============================================
-- CORRECCIÓN 2: Eliminar coordinaciones adicionales incorrectas
-- ============================================
-- Aplicar si: auth_user_coordinaciones contiene BOOM
-- Nota: Ejecutivos normalmente NO tienen entradas en auth_user_coordinaciones
--       Esta tabla es para coordinadores con múltiples coordinaciones

-- PASO 2A: Ver coordinaciones actuales
SELECT 
  'Coordinaciones actuales en auth_user_coordinaciones:' as info,
  c.codigo,
  c.nombre,
  uc.assigned_at
FROM auth_user_coordinaciones uc
JOIN coordinaciones c ON uc.coordinacion_id = c.id
WHERE uc.user_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
);

-- PASO 2B: UNCOMMENT para eliminar BOOM
/*
DELETE FROM auth_user_coordinaciones
WHERE user_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND coordinacion_id IN (
  SELECT id FROM coordinaciones WHERE codigo = 'BOOM'
);

SELECT 'Coordinación BOOM eliminada de auth_user_coordinaciones' as resultado;
*/

-- PASO 2C: Si es EJECUTIVO, eliminar TODAS las entradas de auth_user_coordinaciones
-- Ejecutivos NO deben tener entradas aquí (solo coordinadores)
/*
DELETE FROM auth_user_coordinaciones
WHERE user_id IN (
  SELECT u.id 
  FROM auth_users u
  JOIN auth_roles r ON u.role_id = r.id
  WHERE u.email = 'mayragonzalezs@vidavacations.com'
  AND r.name = 'ejecutivo'
);

SELECT 'Todas las coordinaciones eliminadas de auth_user_coordinaciones (ejecutivo)' as resultado;
*/

-- ============================================
-- CORRECCIÓN 3: Reasignar prospectos de BOOM mal asignados
-- ============================================
-- Aplicar si: Tiene prospectos con coordinacion_id = BOOM
-- Opciones:
--   A. Desasignar (ejecutivo_id = NULL)
--   B. Asignar a otro ejecutivo de BOOM

-- PASO 3A: Ver prospectos de BOOM asignados a ella
SELECT 
  'Prospectos de BOOM asignados a Mayra:' as info,
  p.id,
  p.nombre,
  p.whatsapp,
  p.etapa_id,
  p.created_at
FROM prospectos p
JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE p.ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'BOOM';

-- PASO 3B OPCIÓN A: UNCOMMENT para desasignar (ejecutivo_id = NULL)
/*
UPDATE prospectos
SET 
  ejecutivo_id = NULL,
  updated_at = NOW()
WHERE ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND coordinacion_id IN (
  SELECT id FROM coordinaciones WHERE codigo = 'BOOM'
);

SELECT 'Prospectos de BOOM desasignados' as resultado;
*/

-- PASO 3B OPCIÓN B: Reasignar a otro ejecutivo de BOOM
-- UNCOMMENT y reemplazar 'EJECUTIVO_BOOM_UUID' con el ID correcto
/*
UPDATE prospectos
SET 
  ejecutivo_id = 'EJECUTIVO_BOOM_UUID', -- ⚠️ REEMPLAZAR con UUID real
  updated_at = NOW()
WHERE ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND coordinacion_id IN (
  SELECT id FROM coordinaciones WHERE codigo = 'BOOM'
);

SELECT 'Prospectos de BOOM reasignados a otro ejecutivo' as resultado;
*/

-- ============================================
-- CORRECCIÓN 4: Eliminar relación de backup con ejecutivos de BOOM
-- ============================================
-- Aplicar si: Es backup de ejecutivos de BOOM

-- PASO 4A: Ver ejecutivos de BOOM donde es backup
SELECT 
  'Ejecutivos de BOOM donde Mayra es backup:' as info,
  u.id,
  u.email,
  u.full_name,
  (SELECT COUNT(*) FROM prospectos WHERE ejecutivo_id = u.id) as total_prospectos
FROM auth_users u
JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE u.backup_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'BOOM';

-- PASO 4B: UNCOMMENT para remover como backup
/*
UPDATE auth_users
SET 
  backup_id = NULL,
  has_backup = false,
  updated_at = NOW()
WHERE backup_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND coordinacion_id IN (
  SELECT id FROM coordinaciones WHERE codigo = 'BOOM'
);

SELECT 'Mayra removida como backup de ejecutivos de BOOM' as resultado;
*/

-- ============================================
-- CORRECCIÓN 5: Limpiar asignaciones en prospect_assignments
-- ============================================
-- Aplicar si: Tiene asignaciones activas de prospectos de BOOM

-- PASO 5A: Ver asignaciones activas de BOOM
SELECT 
  'Asignaciones activas de prospectos BOOM:' as info,
  pa.prospect_id,
  pa.coordinacion_id,
  pa.ejecutivo_id,
  pa.assigned_at,
  pa.is_active,
  p.nombre as prospecto_nombre
FROM prospect_assignments pa
JOIN prospectos p ON pa.prospect_id = p.id
WHERE pa.ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND pa.coordinacion_id IN (
  SELECT id FROM coordinaciones WHERE codigo = 'BOOM'
)
AND pa.is_active = true;

-- PASO 5B: UNCOMMENT para desactivar asignaciones
/*
UPDATE prospect_assignments
SET 
  is_active = false,
  unassigned_at = NOW()
WHERE ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND coordinacion_id IN (
  SELECT id FROM coordinaciones WHERE codigo = 'BOOM'
)
AND is_active = true;

SELECT 'Asignaciones de BOOM desactivadas' as resultado;
*/

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
-- Ejecutar después de aplicar correcciones

SELECT '=== VERIFICACIÓN FINAL ===' as seccion;

-- 1. Coordinación principal
SELECT 
  'Coordinación principal:' as campo,
  c.codigo as valor
FROM auth_users u
JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE u.email = 'mayragonzalezs@vidavacations.com';
-- Esperado: 'VEN'

-- 2. Coordinaciones adicionales
SELECT 
  'Coordinaciones adicionales:' as campo,
  COUNT(*) as total,
  STRING_AGG(c.codigo, ', ') as codigos
FROM auth_user_coordinaciones uc
JOIN coordinaciones c ON uc.coordinacion_id = c.id
WHERE uc.user_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
);
-- Esperado para ejecutivo: total = 0
-- Esperado para coordinador: solo 'VEN'

-- 3. Prospectos de BOOM
SELECT 
  'Prospectos de BOOM asignados:' as campo,
  COUNT(*) as total
FROM prospectos p
JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE p.ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'BOOM';
-- Esperado: 0

-- 4. Ejecutivos donde es backup en BOOM
SELECT 
  'Ejecutivos BOOM donde es backup:' as campo,
  COUNT(*) as total
FROM auth_users u
JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE u.backup_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'BOOM';
-- Esperado: 0

-- 5. Asignaciones activas en BOOM
SELECT 
  'Asignaciones activas de BOOM:' as campo,
  COUNT(*) as total
FROM prospect_assignments pa
WHERE pa.ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND pa.coordinacion_id IN (
  SELECT id FROM coordinaciones WHERE codigo = 'BOOM'
)
AND pa.is_active = true;
-- Esperado: 0

-- ============================================
-- RESUMEN DE VERIFICACIÓN
-- ============================================

SELECT '=== RESUMEN FINAL ===' as seccion;

WITH mayra_data AS (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
),
verificacion AS (
  SELECT 
    (SELECT c.codigo FROM auth_users u JOIN coordinaciones c ON u.coordinacion_id = c.id WHERE u.id IN (SELECT id FROM mayra_data)) as coord_principal,
    (SELECT COUNT(*) FROM auth_user_coordinaciones WHERE user_id IN (SELECT id FROM mayra_data)) as coordinaciones_adicionales,
    (SELECT COUNT(*) FROM prospectos p JOIN coordinaciones c ON p.coordinacion_id = c.id WHERE p.ejecutivo_id IN (SELECT id FROM mayra_data) AND c.codigo = 'BOOM') as prospectos_boom,
    (SELECT COUNT(*) FROM auth_users u JOIN coordinaciones c ON u.coordinacion_id = c.id WHERE u.backup_id IN (SELECT id FROM mayra_data) AND c.codigo = 'BOOM') as backup_en_boom,
    (SELECT COUNT(*) FROM prospect_assignments pa WHERE pa.ejecutivo_id IN (SELECT id FROM mayra_data) AND pa.coordinacion_id IN (SELECT id FROM coordinaciones WHERE codigo = 'BOOM') AND pa.is_active = true) as asignaciones_boom
)
SELECT 
  *,
  CASE 
    WHEN coord_principal = 'VEN' 
      AND coordinaciones_adicionales = 0 
      AND prospectos_boom = 0 
      AND backup_en_boom = 0 
      AND asignaciones_boom = 0 
    THEN '✅ CORRECTO - No debería ver leads de BOOM'
    ELSE '❌ REVISAR - Todavía tiene acceso a BOOM'
  END as estado_final
FROM verificacion;

-- ============================================
-- REGISTRO DE AUDITORÍA
-- ============================================

-- UNCOMMENT para registrar cambios en assignment_logs
/*
INSERT INTO assignment_logs (
  prospect_id,
  previous_ejecutivo_id,
  new_ejecutivo_id,
  changed_by,
  change_reason,
  coordinacion_id
)
SELECT 
  p.id as prospect_id,
  p.ejecutivo_id as previous_ejecutivo_id,
  NULL as new_ejecutivo_id,
  (SELECT id FROM auth_users WHERE email = 'admin@example.com') as changed_by, -- ⚠️ REEMPLAZAR
  'Corrección: Mayra no debería tener prospectos de BOOM' as change_reason,
  p.coordinacion_id
FROM prospectos p
JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE p.ejecutivo_id IN (
  SELECT id FROM auth_users WHERE email = 'mayragonzalezs@vidavacations.com'
)
AND c.codigo = 'BOOM';
*/
