-- ============================================
-- ACTUALIZAR TABLA TIMELINE CON NUEVOS CAMPOS
-- Base de datos: system_ui (zbylezfyagwrxoecioup.supabase.co)
-- ============================================

-- 1. Agregar columna asignado_a (array de UUIDs para múltiples integrantes)
ALTER TABLE timeline_activities 
ADD COLUMN IF NOT EXISTS asignado_a UUID[] DEFAULT '{}';

-- 2. Cambiar valores de prioridad de inglés a español
-- Primero actualizar los valores existentes
UPDATE timeline_activities 
SET priority = CASE 
  WHEN priority = 'low' THEN 'baja'
  WHEN priority = 'medium' THEN 'media'
  WHEN priority = 'high' THEN 'alta'
  WHEN priority = 'urgent' THEN 'critica'
  ELSE 'media'
END;

-- 3. Modificar el CHECK constraint para usar valores en español
ALTER TABLE timeline_activities 
DROP CONSTRAINT IF EXISTS timeline_activities_priority_check;

ALTER TABLE timeline_activities 
ADD CONSTRAINT timeline_activities_priority_check 
CHECK (priority IN ('baja', 'media', 'alta', 'critica'));

-- 4. Cambiar el valor por defecto de prioridad
ALTER TABLE timeline_activities 
ALTER COLUMN priority SET DEFAULT 'media';

-- 5. Agregar columna realizado (booleano)
ALTER TABLE timeline_activities 
ADD COLUMN IF NOT EXISTS realizado BOOLEAN DEFAULT false;

-- 6. Crear índice para asignado_a (usando GIN para arrays)
CREATE INDEX IF NOT EXISTS idx_timeline_asignado_a ON timeline_activities USING GIN(asignado_a);

-- 7. Crear índice para realizado
CREATE INDEX IF NOT EXISTS idx_timeline_realizado ON timeline_activities(realizado);

-- 8. Actualizar comentarios
COMMENT ON COLUMN timeline_activities.asignado_a IS 'Array de UUIDs de usuarios asignados a la actividad';
COMMENT ON COLUMN timeline_activities.priority IS 'Prioridad: baja, media, alta, critica';
COMMENT ON COLUMN timeline_activities.realizado IS 'Indica si la actividad está realizada';

-- 9. Verificar cambios
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'timeline_activities'
ORDER BY ordinal_position;

