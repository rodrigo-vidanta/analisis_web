-- ============================================
-- CREAR TABLAS UI PARA LOG MONITOR
-- Base de datos: Log Monitor (dffuwdzybhypxfzrmdcz.supabase.co)
-- ============================================
-- Este script crea las tablas necesarias para el dashboard de logs
-- Todas las tablas UI llevan el prefijo ui_

-- ============================================
-- 1. TABLA: ui_error_log_status
-- ============================================
-- Almacena el estado de lectura y prioridad de cada log
CREATE TABLE IF NOT EXISTS public.ui_error_log_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_log_id UUID NOT NULL REFERENCES public.error_log(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID, -- ID del usuario que marcó como leído
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  archived_by UUID, -- ID del usuario que archivó
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(error_log_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ui_error_log_status_error_log_id ON public.ui_error_log_status(error_log_id);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_status_is_read ON public.ui_error_log_status(is_read);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_status_is_archived ON public.ui_error_log_status(is_archived);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_status_priority ON public.ui_error_log_status(priority);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_status_read_by ON public.ui_error_log_status(read_by);

-- Comentarios
COMMENT ON TABLE public.ui_error_log_status IS 'Estado de lectura y prioridad de logs de error';
COMMENT ON COLUMN public.ui_error_log_status.is_read IS 'Indica si el log ha sido leído';
COMMENT ON COLUMN public.ui_error_log_status.priority IS 'Prioridad del log: low, medium, high, critical';

-- ============================================
-- 2. TABLA: ui_error_log_annotations
-- ============================================
-- Almacena observaciones y notas sobre logs específicos
CREATE TABLE IF NOT EXISTS public.ui_error_log_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_log_id UUID NOT NULL REFERENCES public.error_log(id) ON DELETE CASCADE,
  annotation_text TEXT NOT NULL,
  created_by UUID NOT NULL, -- ID del usuario que creó la anotación
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ui_error_log_annotations_error_log_id ON public.ui_error_log_annotations(error_log_id);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_annotations_created_by ON public.ui_error_log_annotations(created_by);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_annotations_created_at ON public.ui_error_log_annotations(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.ui_error_log_annotations IS 'Anotaciones y observaciones sobre logs de error';
COMMENT ON COLUMN public.ui_error_log_annotations.annotation_text IS 'Texto de la anotación u observación';

-- ============================================
-- 3. TABLA: ui_error_log_tags
-- ============================================
-- Almacena etiquetas personalizadas para logs
CREATE TABLE IF NOT EXISTS public.ui_error_log_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_log_id UUID NOT NULL REFERENCES public.error_log(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_color TEXT, -- Color hexadecimal para la UI (ej: #FF5733)
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(error_log_id, tag_name) -- Un log no puede tener la misma etiqueta dos veces
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ui_error_log_tags_error_log_id ON public.ui_error_log_tags(error_log_id);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_tags_tag_name ON public.ui_error_log_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_tags_created_by ON public.ui_error_log_tags(created_by);

-- Comentarios
COMMENT ON TABLE public.ui_error_log_tags IS 'Etiquetas personalizadas para logs de error';
COMMENT ON COLUMN public.ui_error_log_tags.tag_name IS 'Nombre de la etiqueta';
COMMENT ON COLUMN public.ui_error_log_tags.tag_color IS 'Color hexadecimal para mostrar en la UI';

-- ============================================
-- 4. TABLA: ui_error_log_ai_analysis
-- ============================================
-- Almacena análisis de IA realizados sobre logs específicos
CREATE TABLE IF NOT EXISTS public.ui_error_log_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_log_id UUID NOT NULL REFERENCES public.error_log(id) ON DELETE CASCADE,
  analysis_text TEXT NOT NULL, -- Análisis completo (máximo 2000 tokens)
  analysis_summary TEXT NOT NULL, -- Resumen del análisis (máximo 200 tokens)
  suggested_fix TEXT, -- Solución sugerida (opcional, máximo 500 tokens)
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  tokens_used INTEGER NOT NULL DEFAULT 0 CHECK (tokens_used >= 0),
  model_used TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT, -- Mensaje de error si falló el análisis
  UNIQUE(error_log_id) -- Un log solo puede tener un análisis activo
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ui_error_log_ai_analysis_error_log_id ON public.ui_error_log_ai_analysis(error_log_id);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_ai_analysis_status ON public.ui_error_log_ai_analysis(status);
CREATE INDEX IF NOT EXISTS idx_ui_error_log_ai_analysis_created_at ON public.ui_error_log_ai_analysis(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.ui_error_log_ai_analysis IS 'Análisis de IA realizados sobre logs de error';
COMMENT ON COLUMN public.ui_error_log_ai_analysis.analysis_text IS 'Análisis completo del error (máx 2000 tokens)';
COMMENT ON COLUMN public.ui_error_log_ai_analysis.analysis_summary IS 'Resumen ejecutivo del análisis (máx 200 tokens)';
COMMENT ON COLUMN public.ui_error_log_ai_analysis.suggested_fix IS 'Solución sugerida por la IA (máx 500 tokens)';
COMMENT ON COLUMN public.ui_error_log_ai_analysis.confidence_score IS 'Nivel de confianza del análisis (0-100)';
COMMENT ON COLUMN public.ui_error_log_ai_analysis.tokens_used IS 'Número de tokens utilizados en el análisis';
COMMENT ON COLUMN public.ui_error_log_ai_analysis.model_used IS 'Modelo de IA utilizado para el análisis';

-- ============================================
-- 5. FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_ui_error_log_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ui_error_log_annotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trigger_update_ui_error_log_status_updated_at ON public.ui_error_log_status;
CREATE TRIGGER trigger_update_ui_error_log_status_updated_at
  BEFORE UPDATE ON public.ui_error_log_status
  FOR EACH ROW
  EXECUTE FUNCTION update_ui_error_log_status_updated_at();

DROP TRIGGER IF EXISTS trigger_update_ui_error_log_annotations_updated_at ON public.ui_error_log_annotations;
CREATE TRIGGER trigger_update_ui_error_log_annotations_updated_at
  BEFORE UPDATE ON public.ui_error_log_annotations
  FOR EACH ROW
  EXECUTE FUNCTION update_ui_error_log_annotations_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas UI
ALTER TABLE public.ui_error_log_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_error_log_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_error_log_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_error_log_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Políticas para ui_error_log_status
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden leer estado de logs"
  ON public.ui_error_log_status FOR SELECT
  USING (true);

-- Permitir inserción/actualización a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden modificar estado de logs"
  ON public.ui_error_log_status FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para ui_error_log_annotations
CREATE POLICY "Usuarios autenticados pueden leer anotaciones"
  ON public.ui_error_log_annotations FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear anotaciones"
  ON public.ui_error_log_annotations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar sus propias anotaciones"
  ON public.ui_error_log_annotations FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar sus propias anotaciones"
  ON public.ui_error_log_annotations FOR DELETE
  USING (true);

-- Políticas para ui_error_log_tags
CREATE POLICY "Usuarios autenticados pueden leer etiquetas"
  ON public.ui_error_log_tags FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear etiquetas"
  ON public.ui_error_log_tags FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar etiquetas"
  ON public.ui_error_log_tags FOR DELETE
  USING (true);

-- Políticas para ui_error_log_ai_analysis
CREATE POLICY "Usuarios autenticados pueden leer análisis de IA"
  ON public.ui_error_log_ai_analysis FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear análisis de IA"
  ON public.ui_error_log_ai_analysis FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar análisis de IA"
  ON public.ui_error_log_ai_analysis FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 7. VISTAS ÚTILES
-- ============================================

-- Vista combinada de logs con estado UI
CREATE OR REPLACE VIEW public.v_error_logs_with_ui_status AS
SELECT 
  el.*,
  COALESCE(ui.is_read, false) as ui_is_read,
  ui.read_at as ui_read_at,
  ui.read_by as ui_read_by,
  COALESCE(ui.is_archived, false) as ui_is_archived,
  ui.archived_at as ui_archived_at,
  ui.priority as ui_priority,
  (SELECT COUNT(*) FROM public.ui_error_log_tags WHERE error_log_id = el.id) as tag_count,
  (SELECT COUNT(*) FROM public.ui_error_log_annotations WHERE error_log_id = el.id) as annotation_count,
  EXISTS(SELECT 1 FROM public.ui_error_log_ai_analysis WHERE error_log_id = el.id AND status = 'completed') as has_ai_analysis
FROM public.error_log el
LEFT JOIN public.ui_error_log_status ui ON el.id = ui.error_log_id;

-- Comentario en la vista
COMMENT ON VIEW public.v_error_logs_with_ui_status IS 'Vista combinada de logs con información de estado UI';

