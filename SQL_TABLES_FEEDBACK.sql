-- ============================================
-- TABLAS DE RETROALIMENTACIÓN - VERSIÓN SIMPLIFICADA
-- Para copiar y pegar directamente en Supabase SQL Editor
-- ============================================

-- TABLA PRINCIPAL: call_feedback
CREATE TABLE IF NOT EXISTS call_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID NOT NULL,
    feedback_text TEXT NOT NULL,
    feedback_summary TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    UNIQUE(call_id)
);

-- TABLA DE HISTORIAL: call_feedback_history
CREATE TABLE IF NOT EXISTS call_feedback_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID NOT NULL,
    call_id UUID NOT NULL,
    feedback_text TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    action_type VARCHAR(20) NOT NULL,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    change_reason TEXT
);

-- ÍNDICES BÁSICOS
CREATE INDEX IF NOT EXISTS idx_call_feedback_call_id ON call_feedback(call_id);
CREATE INDEX IF NOT EXISTS idx_call_feedback_created_by ON call_feedback(created_by);
CREATE INDEX IF NOT EXISTS idx_feedback_history_feedback_id ON call_feedback_history(feedback_id);

-- COMENTARIOS
COMMENT ON TABLE call_feedback IS 'Retroalimentaciones de evaluadores para llamadas específicas';
COMMENT ON COLUMN call_feedback.feedback_text IS 'Texto de retroalimentación (máximo 1500 caracteres)';
COMMENT ON COLUMN call_feedback.feedback_summary IS 'Resumen automático de los primeros 100 caracteres';
