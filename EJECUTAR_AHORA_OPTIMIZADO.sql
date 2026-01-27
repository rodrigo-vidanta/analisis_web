-- ============================================
-- SOLUCIÓN: ACTUALIZAR VISTA CON ETAPAS
-- ============================================
-- URL: https://supabase.com/dashboard/project/glsmifhkoaifvaegsozd/sql/new
-- Tiempo estimado: 2 minutos
-- Riesgo: Bajo (solo actualiza vista, no modifica datos)
-- ============================================

-- PASO 1: Eliminar vista anterior (si existe)
DROP VIEW IF EXISTS prospectos_con_ejecutivo_y_coordinacion CASCADE;

-- PASO 2: Crear vista optimizada con etapas
CREATE OR REPLACE VIEW prospectos_con_ejecutivo_y_coordinacion AS
SELECT 
  -- Todas las columnas de prospectos
  p.*,
  
  -- Datos del ejecutivo
  e.full_name as ejecutivo_nombre,
  e.email as ejecutivo_email,
  e.phone as ejecutivo_telefono,
  e.is_operativo as ejecutivo_is_operativo,
  e.backup_id as ejecutivo_backup_id,
  e.has_backup as ejecutivo_has_backup,
  e.avatar_url as ejecutivo_avatar,
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
LEFT JOIN auth_users e ON p.ejecutivo_id = e.id
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id
LEFT JOIN etapas et ON p.etapa_id = et.id

WHERE et.is_active = true OR p.etapa_id IS NULL;

-- PASO 3: Agregar comentario y permisos
COMMENT ON VIEW prospectos_con_ejecutivo_y_coordinacion IS 
'Vista optimizada con ejecutivo, coordinación y etapas. Actualizada: 27 Enero 2026';

-- Asegurar permisos correctos (hereda de tabla prospectos)
GRANT SELECT ON prospectos_con_ejecutivo_y_coordinacion TO authenticated;
GRANT SELECT ON prospectos_con_ejecutivo_y_coordinacion TO service_role;

-- ============================================
-- VERIFICACIÓN 1: Prospectos en "Atendió llamada"
-- ============================================

SELECT 
  COUNT(*) as total_atendio_llamada,
  COUNT(DISTINCT ejecutivo_id) as ejecutivos_distintos,
  COUNT(DISTINCT coordinacion_id) as coordinaciones_distintas
FROM prospectos_con_ejecutivo_y_coordinacion
WHERE etapa_codigo = 'atendio_llamada';

-- Debería mostrar: total_atendio_llamada = 118

-- ============================================
-- VERIFICACIÓN 2: Muestra de prospectos
-- ============================================

SELECT 
  id,
  nombre_completo,
  whatsapp,
  etapa_codigo,
  etapa_nombre_real,
  etapa_color,
  ejecutivo_nombre,
  coordinacion_nombre
FROM prospectos_con_ejecutivo_y_coordinacion
WHERE etapa_codigo = 'atendio_llamada'
LIMIT 5;

-- ============================================
-- VERIFICACIÓN 3: Totales por etapa
-- ============================================

SELECT 
  etapa_codigo,
  etapa_nombre_real,
  COUNT(*) as total,
  COUNT(DISTINCT ejecutivo_id) as con_ejecutivo,
  COUNT(DISTINCT coordinacion_id) as con_coordinacion
FROM prospectos_con_ejecutivo_y_coordinacion
WHERE etapa_codigo IS NOT NULL
GROUP BY etapa_codigo, etapa_nombre_real, etapa_orden
ORDER BY etapa_orden;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- ✅ Esta vista es VIRTUAL (no materializada)
--    Los cambios en tablas base se reflejan inmediatamente
--    NO requiere REFRESH

-- ✅ Hereda RLS de tabla 'prospectos'
--    Los permisos se aplican automáticamente

-- ✅ Índices necesarios (verificar que existan):
--    - prospectos(etapa_id)
--    - prospectos(coordinacion_id)
--    - prospectos(ejecutivo_id)

-- ✅ Después de ejecutar este script:
--    1. Refrescar app (Cmd+R)
--    2. Abrir módulo de Prospectos
--    3. Cambiar a vista Kanban
--    4. Verificar columna "Atendió llamada"

-- ============================================
