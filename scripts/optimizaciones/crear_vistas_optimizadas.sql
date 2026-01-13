-- ============================================
-- VISTAS OPTIMIZADAS POST-MIGRACIÓN
-- PQNC_AI - BD Unificada
-- Fecha: 2025-01-13
-- ============================================
-- 
-- Ahora que auth_users, coordinaciones y prospectos están en PQNC_AI,
-- podemos crear vistas que combinen datos con JOINs para optimizar el frontend
--
-- ============================================

-- ============================================
-- 1. VISTA: prospectos_con_ejecutivo_y_coordinacion
-- ============================================
-- Combina prospectos con datos de ejecutivo y coordinación
-- Elimina necesidad de hacer 3 consultas separadas

CREATE OR REPLACE VIEW prospectos_con_ejecutivo_y_coordinacion AS
SELECT 
  p.*,
  -- Datos del ejecutivo
  e.full_name as ejecutivo_nombre,
  e.email as ejecutivo_email,
  e.phone as ejecutivo_telefono,
  e.is_operativo as ejecutivo_is_operativo,
  e.backup_id as ejecutivo_backup_id,
  e.has_backup as ejecutivo_has_backup,
  -- Datos de la coordinación
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo,
  c.descripcion as coordinacion_descripcion
FROM prospectos p
LEFT JOIN auth_users e ON p.ejecutivo_id = e.id
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id;

COMMENT ON VIEW prospectos_con_ejecutivo_y_coordinacion IS 
'Vista optimizada que combina prospectos con ejecutivo y coordinación. Uso en: ProspectosManager, OperativeDashboard';

-- ============================================
-- 2. VISTA: conversaciones_whatsapp_enriched
-- ============================================
-- Conversaciones con datos de prospecto, ejecutivo y coordinación

CREATE OR REPLACE VIEW conversaciones_whatsapp_enriched AS
SELECT 
  conv.*,
  -- Datos del prospecto
  p.nombre_completo as prospecto_nombre,
  p.whatsapp as prospecto_telefono,
  p.etapa as prospecto_etapa,
  p.score as prospecto_score,
  p.requiere_atencion_humana,
  p.ejecutivo_id as prospecto_ejecutivo_id,
  p.coordinacion_id as prospecto_coordinacion_id,
  -- Datos del ejecutivo asignado
  e.full_name as ejecutivo_nombre,
  e.email as ejecutivo_email,
  -- Datos de la coordinación
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo
FROM conversaciones_whatsapp conv
LEFT JOIN prospectos p ON conv.prospecto_id = p.id
LEFT JOIN auth_users e ON p.ejecutivo_id = e.id
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id;

COMMENT ON VIEW conversaciones_whatsapp_enriched IS
'Vista optimizada para Live Chat. Combina conversaciones con prospecto, ejecutivo y coordinación';

-- ============================================
-- 3. VISTA: llamadas_activas_con_prospecto
-- ============================================
-- Llamadas activas con datos completos de prospecto y ejecutivo

CREATE OR REPLACE VIEW llamadas_activas_con_prospecto AS
SELECT 
  l.call_id,
  l.call_status,
  l.fecha_llamada,
  l.duracion_segundos,
  l.audio_ruta_bucket,
  l.datos_llamada,
  l.datos_proceso,
  -- Datos del prospecto
  p.id as prospecto_id,
  p.nombre_completo as prospecto_nombre,
  p.whatsapp as prospecto_telefono,
  p.ejecutivo_id,
  p.coordinacion_id,
  -- Datos del ejecutivo
  e.full_name as ejecutivo_nombre,
  e.email as ejecutivo_email,
  -- Datos de coordinación
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo
FROM llamadas_ventas l
INNER JOIN prospectos p ON l.prospecto = p.id
LEFT JOIN auth_users e ON p.ejecutivo_id = e.id
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE l.duracion_segundos IS NULL OR l.duracion_segundos = 0
  OR l.audio_ruta_bucket IS NULL OR l.audio_ruta_bucket = '';

COMMENT ON VIEW llamadas_activas_con_prospecto IS
'Vista optimizada de llamadas activas con prospecto, ejecutivo y coordinación. Uso en: LlamadasActivasWidget';

-- ============================================
-- 4. VISTA: prospectos_nuevos_dashboard
-- ============================================
-- Prospectos nuevos del día con ejecutivo y coordinación

CREATE OR REPLACE VIEW prospectos_nuevos_dashboard AS
SELECT 
  p.id,
  p.nombre_completo,
  p.nombre_whatsapp,
  p.whatsapp,
  p.etapa,
  p.score,
  p.requiere_atencion_humana,
  p.created_at,
  p.ejecutivo_id,
  p.coordinacion_id,
  -- Ejecutivo
  e.full_name as ejecutivo_nombre,
  e.email as ejecutivo_email,
  -- Coordinación
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo
FROM prospectos p
LEFT JOIN auth_users e ON p.ejecutivo_id = e.id
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE p.created_at >= CURRENT_DATE;

COMMENT ON VIEW prospectos_nuevos_dashboard IS
'Vista para ProspectosNuevosWidget. Prospectos creados hoy con datos completos';

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
    viewname,
    definition IS NOT NULL as tiene_definicion
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'prospectos_con_ejecutivo_y_coordinacion',
    'conversaciones_whatsapp_enriched',
    'llamadas_activas_con_prospecto',
    'prospectos_nuevos_dashboard'
  );
