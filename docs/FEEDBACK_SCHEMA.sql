-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA SISTEMA DE RETROALIMENTACIÓN
-- Fecha: 2025-01-24
-- Versión: 1.0
-- Base: hmmfuhqgvsehkizlfzga.supabase.co
-- ============================================

-- TABLA PRINCIPAL: call_feedback
-- Almacena las retroalimentaciones de las llamadas
CREATE TABLE IF NOT EXISTS call_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id UUID NOT NULL,
    
    -- Contenido de la retroalimentación
    feedback_text TEXT NOT NULL CHECK (char_length(feedback_text) <= 1500),
    feedback_summary TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN char_length(feedback_text) <= 100 THEN feedback_text
            ELSE left(feedback_text, 97) || '...'
        END
    ) STORED,
    
    -- Metadatos de auditoría
    created_by UUID NOT NULL REFERENCES auth_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth_users(id),
    updated_at TIMESTAMP WITH TIME ZONE,
    
    -- Estado y visibilidad
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    
    -- Métricas
    view_count INTEGER DEFAULT 0,
    helpful_votes INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT fk_call_feedback_call FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_feedback_created_by FOREIGN KEY (created_by) REFERENCES auth_users(id),
    CONSTRAINT fk_call_feedback_updated_by FOREIGN KEY (updated_by) REFERENCES auth_users(id),
    
    -- Índices únicos
    UNIQUE(call_id) -- Solo una retroalimentación activa por llamada
);

-- TABLA DE HISTORIAL: call_feedback_history
-- Almacena el historial completo de cambios de retroalimentación
CREATE TABLE IF NOT EXISTS call_feedback_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID NOT NULL,
    call_id UUID NOT NULL,
    
    -- Contenido histórico
    feedback_text TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    
    -- Metadatos de la versión
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('created', 'updated', 'deleted')),
    changed_by UUID NOT NULL REFERENCES auth_users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Información adicional
    change_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Constraints
    CONSTRAINT fk_feedback_history_feedback FOREIGN KEY (feedback_id) REFERENCES call_feedback(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_history_call FOREIGN KEY (call_id) REFERENCES calls(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_history_changed_by FOREIGN KEY (changed_by) REFERENCES auth_users(id)
);

-- TABLA DE INTERACCIONES: call_feedback_interactions
-- Rastrea interacciones de usuarios con las retroalimentaciones
CREATE TABLE IF NOT EXISTS call_feedback_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    feedback_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Tipo de interacción
    interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('view', 'helpful', 'not_helpful', 'report')),
    interaction_value INTEGER DEFAULT 1, -- 1 para positivo, -1 para negativo, 0 para neutral
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    
    -- Constraints
    CONSTRAINT fk_feedback_interactions_feedback FOREIGN KEY (feedback_id) REFERENCES call_feedback(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedback_interactions_user FOREIGN KEY (user_id) REFERENCES auth_users(id),
    
    -- Prevenir múltiples interacciones del mismo tipo por usuario
    UNIQUE(feedback_id, user_id, interaction_type)
);

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices principales para call_feedback
CREATE INDEX IF NOT EXISTS idx_call_feedback_call_id ON call_feedback(call_id);
CREATE INDEX IF NOT EXISTS idx_call_feedback_created_by ON call_feedback(created_by);
CREATE INDEX IF NOT EXISTS idx_call_feedback_created_at ON call_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_feedback_is_active ON call_feedback(is_active) WHERE is_active = true;

-- Índices para call_feedback_history
CREATE INDEX IF NOT EXISTS idx_feedback_history_feedback_id ON call_feedback_history(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_history_call_id ON call_feedback_history(call_id);
CREATE INDEX IF NOT EXISTS idx_feedback_history_changed_at ON call_feedback_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_history_version ON call_feedback_history(feedback_id, version_number DESC);

-- Índices para call_feedback_interactions
CREATE INDEX IF NOT EXISTS idx_feedback_interactions_feedback_id ON call_feedback_interactions(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_interactions_user_id ON call_feedback_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_interactions_type ON call_feedback_interactions(interaction_type);

-- ============================================
-- TRIGGERS PARA AUTOMATIZACIÓN
-- ============================================

-- Trigger para actualizar updated_at en call_feedback
CREATE OR REPLACE FUNCTION update_call_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = NEW.created_by; -- Asumimos que quien actualiza es quien está logueado
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_call_feedback_updated_at
    BEFORE UPDATE ON call_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_call_feedback_updated_at();

-- Trigger para crear entrada en historial automáticamente
CREATE OR REPLACE FUNCTION create_feedback_history_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Determinar el número de versión
    DECLARE
        next_version INTEGER;
    BEGIN
        SELECT COALESCE(MAX(version_number), 0) + 1 
        INTO next_version
        FROM call_feedback_history 
        WHERE feedback_id = COALESCE(NEW.id, OLD.id);
        
        -- Insertar en historial
        IF TG_OP = 'INSERT' THEN
            INSERT INTO call_feedback_history (
                feedback_id, call_id, feedback_text, version_number,
                action_type, changed_by, change_reason
            ) VALUES (
                NEW.id, NEW.call_id, NEW.feedback_text, next_version,
                'created', NEW.created_by, 'Retroalimentación creada'
            );
            RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
            -- Solo crear entrada si el texto cambió
            IF OLD.feedback_text != NEW.feedback_text THEN
                INSERT INTO call_feedback_history (
                    feedback_id, call_id, feedback_text, version_number,
                    action_type, changed_by, change_reason
                ) VALUES (
                    NEW.id, NEW.call_id, NEW.feedback_text, next_version,
                    'updated', NEW.updated_by, 'Retroalimentación actualizada'
                );
            END IF;
            RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
            INSERT INTO call_feedback_history (
                feedback_id, call_id, feedback_text, version_number,
                action_type, changed_by, change_reason
            ) VALUES (
                OLD.id, OLD.call_id, OLD.feedback_text, next_version,
                'deleted', OLD.updated_by, 'Retroalimentación eliminada'
            );
            RETURN OLD;
        END IF;
    END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_feedback_history
    AFTER INSERT OR UPDATE OR DELETE ON call_feedback
    FOR EACH ROW
    EXECUTE FUNCTION create_feedback_history_entry();

-- Trigger para actualizar contadores en call_feedback
CREATE OR REPLACE FUNCTION update_feedback_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Incrementar contador según el tipo
        IF NEW.interaction_type = 'view' THEN
            UPDATE call_feedback 
            SET view_count = view_count + 1 
            WHERE id = NEW.feedback_id;
        ELSIF NEW.interaction_type = 'helpful' THEN
            UPDATE call_feedback 
            SET helpful_votes = helpful_votes + NEW.interaction_value 
            WHERE id = NEW.feedback_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Ajustar contador si cambió el valor
        IF OLD.interaction_type = 'helpful' AND NEW.interaction_type = 'helpful' THEN
            UPDATE call_feedback 
            SET helpful_votes = helpful_votes - OLD.interaction_value + NEW.interaction_value 
            WHERE id = NEW.feedback_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrementar contador
        IF OLD.interaction_type = 'view' THEN
            UPDATE call_feedback 
            SET view_count = GREATEST(view_count - 1, 0) 
            WHERE id = OLD.feedback_id;
        ELSIF OLD.interaction_type = 'helpful' THEN
            UPDATE call_feedback 
            SET helpful_votes = helpful_votes - OLD.interaction_value 
            WHERE id = OLD.feedback_id;
        END IF;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback_counters
    AFTER INSERT OR UPDATE OR DELETE ON call_feedback_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_feedback_counters();

-- ============================================
-- FUNCIONES RPC PARA EL FRONTEND
-- ============================================

-- Función para crear o actualizar retroalimentación
CREATE OR REPLACE FUNCTION upsert_call_feedback(
    p_call_id UUID,
    p_feedback_text TEXT,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    feedback_record RECORD;
    result JSON;
BEGIN
    -- Validar longitud del texto
    IF char_length(p_feedback_text) > 1500 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'El texto de retroalimentación no puede exceder 1500 caracteres',
            'max_length', 1500,
            'current_length', char_length(p_feedback_text)
        );
    END IF;
    
    -- Verificar si ya existe retroalimentación para esta llamada
    SELECT * INTO feedback_record 
    FROM call_feedback 
    WHERE call_id = p_call_id AND is_active = true;
    
    IF feedback_record IS NOT NULL THEN
        -- Actualizar existente
        UPDATE call_feedback 
        SET 
            feedback_text = p_feedback_text,
            updated_by = p_user_id,
            updated_at = NOW()
        WHERE id = feedback_record.id
        RETURNING * INTO feedback_record;
        
        result := json_build_object(
            'success', true,
            'action', 'updated',
            'feedback_id', feedback_record.id,
            'call_id', feedback_record.call_id,
            'feedback_text', feedback_record.feedback_text,
            'feedback_summary', feedback_record.feedback_summary,
            'created_at', feedback_record.created_at,
            'updated_at', feedback_record.updated_at
        );
    ELSE
        -- Crear nueva
        INSERT INTO call_feedback (call_id, feedback_text, created_by)
        VALUES (p_call_id, p_feedback_text, p_user_id)
        RETURNING * INTO feedback_record;
        
        result := json_build_object(
            'success', true,
            'action', 'created',
            'feedback_id', feedback_record.id,
            'call_id', feedback_record.call_id,
            'feedback_text', feedback_record.feedback_text,
            'feedback_summary', feedback_record.feedback_summary,
            'created_at', feedback_record.created_at,
            'updated_at', feedback_record.updated_at
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener retroalimentación de una llamada
CREATE OR REPLACE FUNCTION get_call_feedback(p_call_id UUID)
RETURNS JSON AS $$
DECLARE
    feedback_record RECORD;
    creator_record RECORD;
    updater_record RECORD;
    result JSON;
BEGIN
    -- Obtener retroalimentación
    SELECT cf.*, 
           c_user.full_name as creator_name,
           c_user.email as creator_email,
           u_user.full_name as updater_name,
           u_user.email as updater_email
    INTO feedback_record
    FROM call_feedback cf
    LEFT JOIN auth_users c_user ON cf.created_by = c_user.id
    LEFT JOIN auth_users u_user ON cf.updated_by = u_user.id
    WHERE cf.call_id = p_call_id AND cf.is_active = true;
    
    IF feedback_record IS NOT NULL THEN
        result := json_build_object(
            'success', true,
            'has_feedback', true,
            'feedback_id', feedback_record.id,
            'call_id', feedback_record.call_id,
            'feedback_text', feedback_record.feedback_text,
            'feedback_summary', feedback_record.feedback_summary,
            'created_by', json_build_object(
                'id', feedback_record.created_by,
                'name', feedback_record.creator_name,
                'email', feedback_record.creator_email
            ),
            'updated_by', CASE 
                WHEN feedback_record.updated_by IS NOT NULL THEN
                    json_build_object(
                        'id', feedback_record.updated_by,
                        'name', feedback_record.updater_name,
                        'email', feedback_record.updater_email
                    )
                ELSE NULL
            END,
            'created_at', feedback_record.created_at,
            'updated_at', feedback_record.updated_at,
            'view_count', feedback_record.view_count,
            'helpful_votes', feedback_record.helpful_votes
        );
    ELSE
        result := json_build_object(
            'success', true,
            'has_feedback', false,
            'call_id', p_call_id
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar interacción con retroalimentación
CREATE OR REPLACE FUNCTION register_feedback_interaction(
    p_feedback_id UUID,
    p_user_id UUID,
    p_interaction_type VARCHAR,
    p_interaction_value INTEGER DEFAULT 1
)
RETURNS JSON AS $$
BEGIN
    -- Validar tipo de interacción
    IF p_interaction_type NOT IN ('view', 'helpful', 'not_helpful', 'report') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Tipo de interacción inválido'
        );
    END IF;
    
    -- Insertar o actualizar interacción
    INSERT INTO call_feedback_interactions (feedback_id, user_id, interaction_type, interaction_value)
    VALUES (p_feedback_id, p_user_id, p_interaction_type, p_interaction_value)
    ON CONFLICT (feedback_id, user_id, interaction_type)
    DO UPDATE SET 
        interaction_value = p_interaction_value,
        created_at = NOW();
    
    RETURN json_build_object(
        'success', true,
        'interaction_type', p_interaction_type,
        'interaction_value', p_interaction_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener historial de retroalimentación
CREATE OR REPLACE FUNCTION get_feedback_history(p_feedback_id UUID)
RETURNS JSON AS $$
DECLARE
    history_records JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', h.id,
            'version_number', h.version_number,
            'feedback_text', h.feedback_text,
            'action_type', h.action_type,
            'changed_by', json_build_object(
                'id', u.id,
                'name', u.full_name,
                'email', u.email
            ),
            'changed_at', h.changed_at,
            'change_reason', h.change_reason
        ) ORDER BY h.version_number DESC
    ) INTO history_records
    FROM call_feedback_history h
    LEFT JOIN auth_users u ON h.changed_by = u.id
    WHERE h.feedback_id = p_feedback_id;
    
    RETURN json_build_object(
        'success', true,
        'feedback_id', p_feedback_id,
        'history', COALESCE(history_records, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PERMISOS Y SEGURIDAD
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE call_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_feedback_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_feedback_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para call_feedback
CREATE POLICY "Users can view all active feedback" ON call_feedback
    FOR SELECT USING (is_active = true AND is_public = true);

CREATE POLICY "Users can create feedback" ON call_feedback
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own feedback" ON call_feedback
    FOR UPDATE USING (created_by = auth.uid());

-- Políticas RLS para call_feedback_history
CREATE POLICY "Users can view history of accessible feedback" ON call_feedback_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM call_feedback cf 
            WHERE cf.id = feedback_id 
            AND (cf.is_public = true OR cf.created_by = auth.uid())
        )
    );

-- Políticas RLS para call_feedback_interactions
CREATE POLICY "Users can view their own interactions" ON call_feedback_interactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own interactions" ON call_feedback_interactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ============================================

-- Insertar retroalimentación de prueba (comentar en producción)
/*
INSERT INTO call_feedback (call_id, feedback_text, created_by) 
SELECT 
    c.id,
    'Esta es una retroalimentación de prueba para la llamada ' || c.customer_name || '. El agente mostró buena técnica de rapport pero podría mejorar en el cierre.',
    u.id
FROM calls c
CROSS JOIN auth_users u
WHERE u.email = 'admin@sistema.com'
LIMIT 5;
*/

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE call_feedback IS 'Almacena retroalimentaciones de evaluadores para llamadas específicas';
COMMENT ON TABLE call_feedback_history IS 'Historial completo de cambios en retroalimentaciones';
COMMENT ON TABLE call_feedback_interactions IS 'Interacciones de usuarios con retroalimentaciones (vistas, votos, reportes)';

COMMENT ON COLUMN call_feedback.feedback_text IS 'Texto de retroalimentación (máximo 1500 caracteres)';
COMMENT ON COLUMN call_feedback.feedback_summary IS 'Resumen automático de los primeros 100 caracteres';
COMMENT ON COLUMN call_feedback_history.version_number IS 'Número de versión incremental por retroalimentación';
COMMENT ON COLUMN call_feedback_interactions.interaction_value IS '1 para positivo, -1 para negativo, 0 para neutral';

-- ============================================
-- FIN DEL ESQUEMA
-- ============================================
