-- ============================================
-- RECREAR TABLA LLAMADAS_VENTAS
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Ejecutar en SQL Editor de Supabase
-- IMPORTANTE: Ejecutar DESPUÉS de recrear la tabla prospectos
-- ============================================

-- Crear tabla principal de llamadas de ventas
CREATE TABLE IF NOT EXISTS llamadas_ventas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    fecha_llamada TIMESTAMP WITH TIME ZONE,
    prospecto UUID REFERENCES prospectos(id) ON DELETE SET NULL, -- SET NULL en lugar de CASCADE para preservar datos
    duracion_segundos INTEGER,
    es_venta_exitosa BOOLEAN,
    nivel_interes JSONB,
    probabilidad_cierre DECIMAL(5,2),
    costo_total DECIMAL(10,2),
    tipo_llamada JSONB,
    oferta_presentada BOOLEAN,
    precio_ofertado JSONB,
    requiere_seguimiento BOOLEAN,
    datos_llamada JSONB,
    datos_proceso JSONB,
    datos_objeciones JSONB,
    audio_ruta_bucket TEXT,
    
    -- URLs de control VAPI
    monitor_url TEXT,
    control_url TEXT,
    transport_url TEXT,
    call_sid VARCHAR(255),
    transport VARCHAR(100),
    provider VARCHAR(100),
    account_sid VARCHAR(255),
    call_status VARCHAR(50),
    
    -- Campos de feedback
    tiene_feedback BOOLEAN DEFAULT false,
    feedback_resultado VARCHAR(50),
    feedback_comentarios TEXT,
    feedback_user_email VARCHAR(255),
    feedback_fecha TIMESTAMP WITH TIME ZONE,
    
    -- Campos de checkpoint Kanban
    checkpoint_venta_actual VARCHAR(50) DEFAULT 'checkpoint #1',
    composicion_familiar_numero INTEGER,
    destino_preferido VARCHAR(50),
    preferencia_vacaciones TEXT[],
    numero_noches INTEGER,
    mes_preferencia VARCHAR(2),
    estado_civil VARCHAR(50) DEFAULT 'no_especificado',
    edad INTEGER,
    propuesta_economica_ofrecida INTEGER,
    habitacion_ofertada VARCHAR(100) DEFAULT 'no_ofertada',
    resort_ofertado VARCHAR(50) DEFAULT 'grand_mayan',
    principales_objeciones TEXT DEFAULT 'no presenta objeciones',
    resumen_llamada TEXT,
    
    -- Campos de coordinaciones y ejecutivos
    coordinacion_id UUID,
    ejecutivo_id UUID,
    
    -- Campos de control temporal
    ended_at TIMESTAMP WITH TIME ZONE,
    last_event_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_llamadas_call_id ON llamadas_ventas(call_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_prospecto ON llamadas_ventas(prospecto) WHERE prospecto IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_llamadas_fecha ON llamadas_ventas(fecha_llamada);
CREATE INDEX IF NOT EXISTS idx_llamadas_call_status ON llamadas_ventas(call_status);
CREATE INDEX IF NOT EXISTS idx_llamadas_checkpoint ON llamadas_ventas(checkpoint_venta_actual);
CREATE INDEX IF NOT EXISTS idx_llamadas_destino ON llamadas_ventas(destino_preferido);
CREATE INDEX IF NOT EXISTS idx_llamadas_estado_civil ON llamadas_ventas(estado_civil);
CREATE INDEX IF NOT EXISTS idx_llamadas_feedback_resultado ON llamadas_ventas(feedback_resultado);
CREATE INDEX IF NOT EXISTS idx_llamadas_tiene_feedback ON llamadas_ventas(tiene_feedback);
CREATE INDEX IF NOT EXISTS idx_llamadas_feedback_fecha ON llamadas_ventas(feedback_fecha);
CREATE INDEX IF NOT EXISTS idx_llamadas_coordinacion ON llamadas_ventas(coordinacion_id) WHERE coordinacion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_llamadas_ejecutivo ON llamadas_ventas(ejecutivo_id) WHERE ejecutivo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_llamadas_ended_at ON llamadas_ventas(ended_at);
CREATE INDEX IF NOT EXISTS idx_llamadas_last_event_at ON llamadas_ventas(last_event_at);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_llamadas_ventas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_llamadas_ventas_updated_at ON llamadas_ventas;
CREATE TRIGGER trigger_update_llamadas_ventas_updated_at
    BEFORE UPDATE ON llamadas_ventas
    FOR EACH ROW
    EXECUTE FUNCTION update_llamadas_ventas_updated_at();

-- Función para actualizar automáticamente tiene_feedback cuando se agrega feedback
CREATE OR REPLACE FUNCTION update_tiene_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se actualiza cualquier campo de feedback, marcar tiene_feedback como true
    IF NEW.feedback_resultado IS NOT NULL OR 
       NEW.feedback_comentarios IS NOT NULL OR 
       NEW.feedback_user_email IS NOT NULL OR 
       NEW.feedback_fecha IS NOT NULL THEN
        NEW.tiene_feedback = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar automáticamente tiene_feedback
DROP TRIGGER IF EXISTS trigger_update_tiene_feedback ON llamadas_ventas;
CREATE TRIGGER trigger_update_tiene_feedback
    BEFORE UPDATE ON llamadas_ventas
    FOR EACH ROW
    EXECUTE FUNCTION update_tiene_feedback();

-- Función para asignar llamada según prospecto (sincronizar coordinacion_id y ejecutivo_id)
CREATE OR REPLACE FUNCTION auto_assign_call_to_coordinacion()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la llamada tiene un prospecto asociado
    IF NEW.prospecto IS NOT NULL THEN
        -- Obtener coordinacion_id del prospecto
        SELECT coordinacion_id INTO NEW.coordinacion_id
        FROM prospectos
        WHERE id = NEW.prospecto;
        
        -- Si el prospecto tiene ejecutivo asignado, asignar también la llamada
        IF NEW.coordinacion_id IS NOT NULL THEN
            SELECT ejecutivo_id INTO NEW.ejecutivo_id
            FROM prospectos
            WHERE id = NEW.prospecto;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para nuevas llamadas (asignar automáticamente según prospecto)
DROP TRIGGER IF EXISTS trigger_auto_assign_call ON llamadas_ventas;
CREATE TRIGGER trigger_auto_assign_call
    BEFORE INSERT ON llamadas_ventas
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_call_to_coordinacion();

-- Habilitar Row Level Security (RLS)
ALTER TABLE llamadas_ventas ENABLE ROW LEVEL SECURITY;

-- Política básica: permitir lectura a usuarios autenticados
-- (Ajustar según tus necesidades de permisos)
CREATE POLICY "Users can view llamadas_ventas" ON llamadas_ventas
    FOR SELECT USING (true);

CREATE POLICY "Users can insert llamadas_ventas" ON llamadas_ventas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update llamadas_ventas" ON llamadas_ventas
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete llamadas_ventas" ON llamadas_ventas
    FOR DELETE USING (true);

-- Comentarios para documentación
COMMENT ON TABLE llamadas_ventas IS 'Tabla principal de llamadas de ventas del sistema';
COMMENT ON COLUMN llamadas_ventas.prospecto IS 'ID del prospecto asociado (referencia a prospectos)';
COMMENT ON COLUMN llamadas_ventas.coordinacion_id IS 'ID de la coordinación asignada (referencia a System_UI.coordinaciones)';
COMMENT ON COLUMN llamadas_ventas.ejecutivo_id IS 'ID del ejecutivo asignado (referencia a System_UI.auth_users)';
COMMENT ON COLUMN llamadas_ventas.checkpoint_venta_actual IS 'Checkpoint actual del proceso de venta (checkpoint #1 a #5)';
COMMENT ON COLUMN llamadas_ventas.destino_preferido IS 'Destino de preferencia: nuevo_vallarta, riviera_maya, los_cabos, acapulco';
COMMENT ON COLUMN llamadas_ventas.call_status IS 'Estado de la llamada: activa, transferida, colgada, perdida, exitosa';

SELECT 'Tabla llamadas_ventas recreada exitosamente' AS resultado;

