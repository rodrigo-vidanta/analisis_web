-- ============================================
-- VISTA OPTIMIZADA PARA KANBAN (CORREGIDA)
-- ============================================
-- Fecha: 27 de Enero 2026
-- Usa auth.users NATIVO (no auth_users legacy)

CREATE OR REPLACE VIEW prospectos_con_ejecutivo_y_coordinacion AS
SELECT 
  p.*,
  
  -- Datos del ejecutivo (desde auth.users nativo)
  (au.raw_user_meta_data->>'full_name')::text as ejecutivo_nombre,
  au.email as ejecutivo_email,
  (au.raw_user_meta_data->>'phone')::text as ejecutivo_telefono,
  (au.raw_user_meta_data->>'is_operativo')::boolean as ejecutivo_is_operativo,
  (au.raw_user_meta_data->>'backup_id')::uuid as ejecutivo_backup_id,
  (au.raw_user_meta_data->>'has_backup')::boolean as ejecutivo_has_backup,
  (au.raw_user_meta_data->>'avatar_url')::text as ejecutivo_avatar,
  (au.raw_user_meta_data->>'is_active')::boolean as ejecutivo_activo,
  
  -- Datos de la coordinación
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo,
  c.descripcion as coordinacion_descripcion,
  
  -- Datos de la etapa (FK etapa_id)
  et.nombre as etapa_nombre_real,
  et.codigo as etapa_codigo,
  et.color_ui as etapa_color,
  et.icono as etapa_icono,
  et.orden_funnel as etapa_orden,
  et.es_terminal as etapa_es_terminal,
  et.grupo_objetivo as etapa_grupo_objetivo,
  et.agente_default as etapa_agente_default
  
FROM prospectos p
LEFT JOIN auth.users au ON p.ejecutivo_id = au.id  -- ← auth.users NATIVO
LEFT JOIN coordinaciones c ON p.coordinacion_id = c.id
LEFT JOIN etapas et ON p.etapa_id = et.id

WHERE et.is_active = true OR p.etapa_id IS NULL;

COMMENT ON VIEW prospectos_con_ejecutivo_y_coordinacion IS 
'Vista optimizada - Prospectos con ejecutivo (auth.users nativo), coordinación y etapa. Actualizada 27 Ene 2026.';
