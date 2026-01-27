-- ============================================
-- SOLUCIÓN: ACTUALIZAR VISTA CON ETAPAS
-- ============================================
-- URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
-- Tiempo estimado: 2 minutos
-- Riesgo: Bajo (solo actualiza vista, no modifica datos)
-- ============================================
-- IMPORTANTE: Migración 2026-01-20
-- auth_users → auth.users (nativo) + user_profiles_v2 (vista)
-- ============================================

-- PASO 1: Eliminar vista anterior (si existe)
DROP VIEW IF EXISTS prospectos_con_ejecutivo_y_coordinacion CASCADE;

-- PASO 2: Crear vista optimizada con etapas
CREATE OR REPLACE VIEW prospectos_con_ejecutivo_y_coordinacion AS
SELECT 
  -- Todas las columnas de prospectos
  p.*,
  
  -- Datos del ejecutivo (desde user_profiles_v2)
  e.full_name as ejecutivo_nombre,
  e.email as ejecutivo_email,
  e.phone as ejecutivo_telefono,
  e.is_operativo as ejecutivo_is_operativo,
  e.backup_id as ejecutivo_backup_id,
  e.has_backup as ejecutivo_has_backup,
  NULL::TEXT as ejecutivo_avatar,  -- avatar_url no está en user_profiles_v2
  e.is_active as ejecutivo_activo,
  
  -- Datos de la coordinación
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo,
  c.descripcion as coordinacion_descripcion,
  
  -- Datos de la etapa (NUEVO - CRÍTICO PARA KANBAN)
  et.nombre as etapa_nombre_real,
  et.codigo as etapa_codigo,
  et.color_ui as etapa_color,
  et.icono as etapa_icono,
  et.orden_funnel as etapa_orden,
  et.es_terminal as etapa_es_terminal,
  et.grupo_objetivo as etapa_grupo_objetivo,
  et.agente_default as etapa_agente_default
  
FROM prospectos p
LEFT JOIN user_profiles_v2 e ON p.ejecutivo_id = e.id  -- ← Vista migrada (2026-01-20)
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id
LEFT JOIN etapas et ON p.etapa_id = et.id

WHERE et.is_active = true
   OR p.etapa_id IS NULL;

COMMENT ON VIEW prospectos_con_ejecutivo_y_coordinacion IS 
'Vista optimizada - Prospectos con ejecutivo (user_profiles_v2), coordinación y etapas. Actualizada 27 Ene 2026.';

GRANT SELECT ON prospectos_con_ejecutivo_y_coordinacion TO authenticated;
GRANT SELECT ON prospectos_con_ejecutivo_y_coordinacion TO service_role;
-- OPCIONAL: GRANT SELECT ON prospectos_con_ejecutivo_y_coordinacion TO anon;

-- ============================================
-- VERIFICACIÓN 1: Prospectos en "Atendió llamada"
-- ============================================

SELECT 
  id,
  nombre_completo,
  etapa_codigo,
  etapa_nombre_real,
  ejecutivo_nombre,
  coordinacion_nombre
FROM prospectos_con_ejecutivo_y_coordinacion
WHERE etapa_codigo = 'atendio_llamada'
LIMIT 5;

-- ============================================
-- VERIFICACIÓN 2: Totales por etapa
-- ============================================

SELECT 
  etapa_codigo,
  etapa_nombre_real,
  COUNT(*) as total
FROM prospectos_con_ejecutivo_y_coordinacion
WHERE etapa_codigo IS NOT NULL
GROUP BY etapa_codigo, etapa_nombre_real, etapa_orden
ORDER BY etapa_orden;
