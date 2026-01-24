-- ============================================
-- MIGRACIÓN: Eliminar columnas redundantes de conversaciones_whatsapp
-- ============================================
-- Problema: Las columnas numero_telefono y nombre_contacto están siempre NULL
--           y son redundantes porque los datos están en prospectos
-- Solución: Eliminar estas columnas y usar JOINs con prospectos
-- Fecha: 2026-01-24
-- ============================================

-- IMPORTANTE: Esta migración es DESTRUCTIVA
-- Asegurarse de que:
-- 1. El código ya no usa estas columnas directamente
-- 2. El código hace JOIN con prospectos para obtener estos datos
-- 3. Se ha hecho backup de la tabla

-- ============================================
-- 1. BACKUP (CRÍTICO)
-- ============================================
CREATE TABLE IF NOT EXISTS conversaciones_whatsapp_backup_pre_drop_columns_20260124 AS
SELECT * FROM conversaciones_whatsapp;

-- Verificar backup
SELECT COUNT(*) as total_respaldado FROM conversaciones_whatsapp_backup_pre_drop_columns_20260124;

-- ============================================
-- 2. VERIFICAR DATOS ACTUALES
-- ============================================
-- Ver cuántas conversaciones tienen estos campos con datos
SELECT 
  COUNT(*) as total_conversaciones,
  COUNT(numero_telefono) as con_telefono,
  COUNT(nombre_contacto) as con_nombre,
  SUM(CASE WHEN numero_telefono IS NOT NULL THEN 1 ELSE 0 END) as telefono_no_null,
  SUM(CASE WHEN nombre_contacto IS NOT NULL THEN 1 ELSE 0 END) as nombre_no_null
FROM conversaciones_whatsapp;

-- Ver ejemplos de conversaciones con prospecto_id
SELECT 
  id,
  prospecto_id,
  numero_telefono,
  nombre_contacto,
  estado,
  created_at
FROM conversaciones_whatsapp
WHERE prospecto_id IS NOT NULL
LIMIT 10;

-- ============================================
-- 3. ELIMINAR COLUMNAS REDUNDANTES
-- ============================================
-- ⚠️ DESTRUCTIVO - No se puede revertir fácilmente sin el backup

ALTER TABLE conversaciones_whatsapp 
DROP COLUMN IF EXISTS numero_telefono;

ALTER TABLE conversaciones_whatsapp 
DROP COLUMN IF EXISTS nombre_contacto;

-- ============================================
-- 4. VERIFICAR ELIMINACIÓN
-- ============================================
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversaciones_whatsapp'
  AND column_name IN ('numero_telefono', 'nombre_contacto');

-- Debe retornar 0 filas

-- ============================================
-- 5. CREAR VISTA PARA COMPATIBILIDAD (OPCIONAL)
-- ============================================
-- Si hay código legacy que aún use estas columnas,
-- crear una vista que las incluya via JOIN

CREATE OR REPLACE VIEW conversaciones_whatsapp_con_prospecto AS
SELECT 
  c.*,
  -- Datos del prospecto
  p.whatsapp as prospecto_whatsapp,
  p.nombre_completo as prospecto_nombre_completo,
  p.nombre_whatsapp as prospecto_nombre_whatsapp,
  p.email as prospecto_email,
  p.ejecutivo_id,
  p.coordinacion_id,
  -- Alias para compatibilidad con código antiguo
  p.whatsapp as numero_telefono,
  COALESCE(p.nombre_whatsapp, p.nombre_completo) as nombre_contacto
FROM conversaciones_whatsapp c
LEFT JOIN prospectos p ON c.prospecto_id = p.id;

-- Otorgar permisos
GRANT SELECT ON conversaciones_whatsapp_con_prospecto TO anon;
GRANT SELECT ON conversaciones_whatsapp_con_prospecto TO authenticated;
GRANT SELECT ON conversaciones_whatsapp_con_prospecto TO service_role;

-- Verificar vista
SELECT COUNT(*) as total_en_vista FROM conversaciones_whatsapp_con_prospecto;

-- ============================================
-- 6. EJEMPLO DE QUERY CON LA NUEVA ESTRUCTURA
-- ============================================
-- ANTES (con columnas redundantes):
-- SELECT id, numero_telefono, nombre_contacto FROM conversaciones_whatsapp WHERE numero_telefono = '5215522490483';

-- AHORA (con JOIN):
SELECT 
  c.id,
  c.prospecto_id,
  p.whatsapp as telefono,
  COALESCE(p.nombre_whatsapp, p.nombre_completo) as nombre,
  c.estado,
  c.last_message_at
FROM conversaciones_whatsapp c
LEFT JOIN prospectos p ON c.prospecto_id = p.id
WHERE p.whatsapp = '5215522490483';

-- O usar la vista:
SELECT * FROM conversaciones_whatsapp_con_prospecto 
WHERE numero_telefono = '5215522490483';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- 1. Las columnas numero_telefono y nombre_contacto estaban SIEMPRE NULL
-- 2. Los datos reales están en la tabla prospectos
-- 3. Esta migración ELIMINA la redundancia
-- 4. El código debe actualizarse para:
--    - Hacer JOIN con prospectos cuando necesite nombre/teléfono
--    - O usar la vista conversaciones_whatsapp_con_prospecto
-- 
-- 5. Archivos de código que requieren actualización:
--    - src/services/uchatService.ts (interfaz UChatConversation)
--    - src/services/optimizedConversationsService.ts
--    - src/components/chat/LiveChatDashboard.tsx
--    - src/services/notificationService.ts
--    - src/services/notificationListenerService.ts
-- 
-- ============================================
-- ROLLBACK (Solo en caso de emergencia)
-- ============================================
/*
-- Restaurar columnas desde backup
ALTER TABLE conversaciones_whatsapp 
ADD COLUMN numero_telefono TEXT,
ADD COLUMN nombre_contacto TEXT;

-- Copiar datos del backup
UPDATE conversaciones_whatsapp c
SET 
  numero_telefono = b.numero_telefono,
  nombre_contacto = b.nombre_contacto
FROM conversaciones_whatsapp_backup_pre_drop_columns_20260124 b
WHERE c.id = b.id;

-- Eliminar backup
DROP TABLE conversaciones_whatsapp_backup_pre_drop_columns_20260124;

-- Eliminar vista
DROP VIEW IF EXISTS conversaciones_whatsapp_con_prospecto;
*/

-- ============================================
-- VENTAJAS DE ESTA MIGRACIÓN
-- ============================================
-- ✅ Elimina redundancia de datos
-- ✅ Garantiza consistencia (Single Source of Truth)
-- ✅ No hay que mantener 2 columnas sincronizadas
-- ✅ Búsquedas siempre usan datos actualizados de prospectos
-- ✅ Menos espacio en disco
-- ✅ Esquema más limpio y fácil de entender
