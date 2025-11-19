-- ============================================
-- AGREGAR SEGUIMIENTO DE USUARIO A TABLAS DE LOG
-- Base de datos: Log Monitor (dffuwdzybhypxfzrmdcz.supabase.co)
-- ============================================
-- Este script agrega campos para rastrear qué usuario realizó acciones
-- en los logs (comentarios y solicitudes de análisis de IA)

-- ============================================
-- 1. AGREGAR CAMPO requested_by A ui_error_log_ai_analysis
-- ============================================
-- Agregar columna para rastrear quién solicitó el análisis
ALTER TABLE public.ui_error_log_ai_analysis 
ADD COLUMN IF NOT EXISTS requested_by UUID;

-- Crear índice para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_ui_error_log_ai_analysis_requested_by 
ON public.ui_error_log_ai_analysis(requested_by);

-- Comentario
COMMENT ON COLUMN public.ui_error_log_ai_analysis.requested_by IS 'ID del usuario que solicitó el análisis de IA';

-- ============================================
-- 2. VERIFICAR QUE ui_error_log_annotations TENGA created_by
-- ============================================
-- La tabla ya debería tener created_by, pero verificamos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'ui_error_log_annotations' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.ui_error_log_annotations 
    ADD COLUMN created_by UUID NOT NULL;
    
    CREATE INDEX IF NOT EXISTS idx_ui_error_log_annotations_created_by 
    ON public.ui_error_log_annotations(created_by);
    
    COMMENT ON COLUMN public.ui_error_log_annotations.created_by IS 'ID del usuario que creó la anotación';
  END IF;
END $$;

-- ============================================
-- 3. CREAR VISTA PARA LOGS CON ACTIVIDAD DEL USUARIO
-- ============================================
CREATE OR REPLACE VIEW public.v_user_log_activity AS
SELECT DISTINCT
  el.id as error_log_id,
  el.tipo,
  el.subtipo,
  el.severidad,
  el.ambiente,
  el.timestamp,
  el.mensaje,
  el.descripcion,
  'annotation' as activity_type,
  ua.created_by as user_id,
  ua.created_at as activity_at,
  ua.annotation_text as activity_content
FROM public.error_log el
INNER JOIN public.ui_error_log_annotations ua ON el.id = ua.error_log_id

UNION ALL

SELECT DISTINCT
  el.id as error_log_id,
  el.tipo,
  el.subtipo,
  el.severidad,
  el.ambiente,
  el.timestamp,
  el.mensaje,
  el.descripcion,
  'ai_analysis' as activity_type,
  ua.requested_by as user_id,
  ua.created_at as activity_at,
  ua.analysis_summary as activity_content
FROM public.error_log el
INNER JOIN public.ui_error_log_ai_analysis ua ON el.id = ua.error_log_id
WHERE ua.requested_by IS NOT NULL;

-- Comentario en la vista
COMMENT ON VIEW public.v_user_log_activity IS 'Vista que muestra todos los logs donde un usuario ha realizado actividades (comentarios o análisis de IA)';

-- Índice compuesto para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_v_user_log_activity_user_id_activity_at 
ON public.ui_error_log_annotations(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v_user_log_activity_ai_user_id_created_at 
ON public.ui_error_log_ai_analysis(requested_by, created_at DESC);

