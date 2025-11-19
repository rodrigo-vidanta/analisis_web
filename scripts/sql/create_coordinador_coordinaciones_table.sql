-- ============================================
-- TABLA INTERMEDIA: coordinador_coordinaciones
-- Base de datos: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Propósito: Relación muchos a muchos entre coordinadores y coordinaciones
-- ============================================

-- Tabla intermedia para relación muchos a muchos
CREATE TABLE IF NOT EXISTS coordinador_coordinaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coordinador_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  coordinacion_id UUID NOT NULL REFERENCES coordinaciones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Evitar duplicados
  UNIQUE(coordinador_id, coordinacion_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_coordinador_coordinaciones_coordinador 
ON coordinador_coordinaciones(coordinador_id);

CREATE INDEX IF NOT EXISTS idx_coordinador_coordinaciones_coordinacion 
ON coordinador_coordinaciones(coordinacion_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_coordinador_coordinaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coordinador_coordinaciones_updated_at
BEFORE UPDATE ON coordinador_coordinaciones
FOR EACH ROW
EXECUTE FUNCTION update_coordinador_coordinaciones_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE coordinador_coordinaciones IS 'Tabla intermedia para relación muchos a muchos entre coordinadores y coordinaciones';
COMMENT ON COLUMN coordinador_coordinaciones.coordinador_id IS 'ID del usuario coordinador';
COMMENT ON COLUMN coordinador_coordinaciones.coordinacion_id IS 'ID de la coordinación';

