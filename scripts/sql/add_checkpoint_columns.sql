-- ============================================
-- AGREGAR COLUMNAS DE CHECKPOINT KANBAN A LLAMADAS_VENTAS
-- Base de datos: glsmifhkoaifvaegsozd.supabase.co (analysisSupabase)
-- ============================================

-- Agregar columnas para el sistema Kanban de checkpoints
ALTER TABLE llamadas_ventas 
ADD COLUMN IF NOT EXISTS checkpoint_venta_actual VARCHAR(50) DEFAULT 'checkpoint #1',
ADD COLUMN IF NOT EXISTS composicion_familiar_numero INTEGER,
ADD COLUMN IF NOT EXISTS destino_preferido VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferencia_vacaciones TEXT[], 
ADD COLUMN IF NOT EXISTS numero_noches INTEGER,
ADD COLUMN IF NOT EXISTS mes_preferencia VARCHAR(2),
ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(50) DEFAULT 'no_especificado',
ADD COLUMN IF NOT EXISTS edad INTEGER,
ADD COLUMN IF NOT EXISTS propuesta_economica_ofrecida INTEGER,
ADD COLUMN IF NOT EXISTS habitacion_ofertada VARCHAR(100) DEFAULT 'no_ofertada',
ADD COLUMN IF NOT EXISTS resort_ofertado VARCHAR(50) DEFAULT 'grand_mayan',
ADD COLUMN IF NOT EXISTS principales_objeciones TEXT DEFAULT 'no presenta objeciones',
ADD COLUMN IF NOT EXISTS resumen_llamada TEXT;

-- Crear índices para optimizar consultas Kanban
CREATE INDEX IF NOT EXISTS idx_llamadas_checkpoint ON llamadas_ventas(checkpoint_venta_actual);
CREATE INDEX IF NOT EXISTS idx_llamadas_destino ON llamadas_ventas(destino_preferido);
CREATE INDEX IF NOT EXISTS idx_llamadas_estado_civil ON llamadas_ventas(estado_civil);

-- Comentarios para documentar las nuevas columnas
COMMENT ON COLUMN llamadas_ventas.checkpoint_venta_actual IS 'Checkpoint actual del proceso de venta (checkpoint #1 a #5)';
COMMENT ON COLUMN llamadas_ventas.composicion_familiar_numero IS 'Número total de personas que viajarán (1-20)';
COMMENT ON COLUMN llamadas_ventas.destino_preferido IS 'Destino de preferencia: nuevo_vallarta, riviera_maya, los_cabos, acapulco';

-- Inicializar checkpoints para llamadas existentes sin checkpoint
UPDATE llamadas_ventas 
SET checkpoint_venta_actual = 'checkpoint #1'
WHERE checkpoint_venta_actual IS NULL;

SELECT 'Columnas de checkpoint Kanban agregadas exitosamente a llamadas_ventas' AS resultado;