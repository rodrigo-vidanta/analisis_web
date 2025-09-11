-- ============================================
-- AGREGAR COLUMNAS DE FEEDBACK A LLAMADAS_VENTAS
-- ============================================

-- Agregar columnas para feedback por llamada
ALTER TABLE llamadas_ventas 
ADD COLUMN IF NOT EXISTS feedback_resultado VARCHAR(50),
ADD COLUMN IF NOT EXISTS feedback_comentarios TEXT,
ADD COLUMN IF NOT EXISTS feedback_user_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS feedback_fecha TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tiene_feedback BOOLEAN DEFAULT FALSE;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_llamadas_feedback_resultado ON llamadas_ventas(feedback_resultado);
CREATE INDEX IF NOT EXISTS idx_llamadas_tiene_feedback ON llamadas_ventas(tiene_feedback);
CREATE INDEX IF NOT EXISTS idx_llamadas_feedback_fecha ON llamadas_ventas(feedback_fecha);

-- Comentarios para documentar las columnas
COMMENT ON COLUMN llamadas_ventas.feedback_resultado IS 'Resultado del feedback: contestada, perdida, transferida, problemas_tecnicos';
COMMENT ON COLUMN llamadas_ventas.feedback_comentarios IS 'Comentarios del usuario sobre la llamada';
COMMENT ON COLUMN llamadas_ventas.feedback_user_email IS 'Email del usuario que proporcionó el feedback';
COMMENT ON COLUMN llamadas_ventas.feedback_fecha IS 'Fecha y hora cuando se proporcionó el feedback';
COMMENT ON COLUMN llamadas_ventas.tiene_feedback IS 'Flag booleano para filtrar rápidamente llamadas con feedback';

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

-- Actualizar registros existentes que ya tienen feedback en observaciones
UPDATE llamadas_ventas 
SET tiene_feedback = TRUE 
WHERE feedback_resultado IS NOT NULL 
   OR feedback_comentarios IS NOT NULL;

SELECT 'Columnas de feedback agregadas exitosamente a llamadas_ventas' AS resultado;
