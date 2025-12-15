-- ============================================
-- SCRIPT: Verificar y corregir ejecutivo_id de prospecto
-- ============================================
-- Este script verifica si un prospecto tiene ejecutivo_id asignado
-- y lo limpia si es necesario
-- ============================================

-- Verificar el estado actual del prospecto
SELECT 
  id,
  ejecutivo_id,
  coordinacion_id,
  nombre_completo,
  nombre_whatsapp,
  whatsapp,
  etapa,
  created_at
FROM prospectos
WHERE id = '97c8bd6f-235e-41b5-981d-42a61880442f';

-- Si el prospecto tiene ejecutivo_id asignado pero no debería tenerlo,
-- ejecutar este UPDATE para limpiarlo:
-- UPDATE prospectos
-- SET ejecutivo_id = NULL
-- WHERE id = '97c8bd6f-235e-41b5-981d-42a61880442f';

-- Verificar el ejecutivo asignado
SELECT 
  id,
  email,
  full_name,
  coordinacion_id,
  role_name,
  is_active,
  is_operativo
FROM auth_users
WHERE id = '4e8271b3-5a03-46cb-a6e1-29020f3e4ef8';

-- ============================================
-- NOTA: Si el prospecto NO debería tener ejecutivo_id asignado,
-- ejecutar el UPDATE comentado arriba para limpiarlo.
-- ============================================

