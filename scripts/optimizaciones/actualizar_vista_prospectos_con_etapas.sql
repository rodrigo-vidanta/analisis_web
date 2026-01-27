-- ============================================
-- ACTUALIZACIÓN DE VISTA PARA KANBAN
-- ============================================
-- Fecha: 27 de Enero 2026
-- Actualiza vista existente para incluir datos de etapas (migración etapa_id)

-- ============================================
-- ACTUALIZAR: prospectos_con_ejecutivo_y_coordinacion
-- ============================================
-- Agrega datos de la tabla etapas (nueva columna etapa_id FK)

CREATE OR REPLACE VIEW prospectos_con_ejecutivo_y_coordinacion AS
SELECT 
  p.*,
  
  -- ============================================
  -- DATOS DEL EJECUTIVO
  -- ============================================
  e.full_name as ejecutivo_nombre,
  e.email as ejecutivo_email,
  e.phone as ejecutivo_telefono,
  e.is_operativo as ejecutivo_is_operativo,
  e.backup_id as ejecutivo_backup_id,
  e.has_backup as ejecutivo_has_backup,
  e.avatar_url as ejecutivo_avatar,
  e.is_active as ejecutivo_activo,
  
  -- ============================================
  -- DATOS DE LA COORDINACIÓN
  -- ============================================
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo,
  c.descripcion as coordinacion_descripcion,
  
  -- ============================================
  -- DATOS DE LA ETAPA (NUEVO - migración etapa_id)
  -- ============================================
  et.nombre as etapa_nombre_real,
  et.codigo as etapa_codigo,
  et.color_ui as etapa_color,
  et.icono as etapa_icono,
  et.orden_funnel as etapa_orden,
  et.es_terminal as etapa_es_terminal,
  et.grupo_objetivo as etapa_grupo_objetivo,
  et.checkpoint_codigo as etapa_checkpoint,
  et.agente_default as etapa_agente_default
  
FROM prospectos p
LEFT JOIN auth_users e ON p.ejecutivo_id = e.id
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id
LEFT JOIN etapas et ON p.etapa_id = et.id  -- ← NUEVO JOIN con etapas

WHERE et.is_active = true  -- Solo etapas activas
   OR p.etapa_id IS NULL;  -- Incluir prospectos legacy sin etapa_id

-- ============================================
-- COMENTARIO ACTUALIZADO
-- ============================================
COMMENT ON VIEW prospectos_con_ejecutivo_y_coordinacion IS 
'Vista optimizada que combina prospectos con ejecutivo, coordinación Y etapa (migración etapa_id). 
Elimina necesidad de 4 queries separadas. 
Uso en: ProspectosManager (Kanban + DataGrid), OperativeDashboard, ProspectosNuevosWidget.
Actualizada: 27 Enero 2026 - Agregados datos de etapas.';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Probar que funciona correctamente
SELECT 
  id,
  nombre_completo,
  etapa_nombre_real,
  etapa_codigo,
  etapa_color,
  ejecutivo_nombre,
  coordinacion_nombre
FROM prospectos_con_ejecutivo_y_coordinacion
WHERE etapa_codigo = 'atendio_llamada'
LIMIT 5;

-- Verificar totales por etapa
SELECT 
  etapa_codigo,
  etapa_nombre_real,
  COUNT(*) as total
FROM prospectos_con_ejecutivo_y_coordinacion
GROUP BY etapa_codigo, etapa_nombre_real
ORDER BY total DESC;
