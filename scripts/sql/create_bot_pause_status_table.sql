-- ============================================
-- CREAR TABLA bot_pause_status EN SYSTEMUI
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Ejecutar en SQL Editor de Supabase SystemUI
-- ============================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS bot_pause_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uchat_id VARCHAR(255) NOT NULL UNIQUE,
  is_paused BOOLEAN DEFAULT false,
  paused_until TIMESTAMP WITH TIME ZONE,
  paused_by VARCHAR(100) DEFAULT 'agent',
  duration_minutes INTEGER, -- Duración en minutos (NULL para indefinido)
  paused_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_bot_pause_status_uchat_id ON bot_pause_status(uchat_id);
CREATE INDEX IF NOT EXISTS idx_bot_pause_status_is_paused ON bot_pause_status(is_paused);
CREATE INDEX IF NOT EXISTS idx_bot_pause_status_paused_until ON bot_pause_status(paused_until) WHERE is_paused = true;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_bot_pause_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_bot_pause_status_updated_at ON bot_pause_status;
CREATE TRIGGER trigger_update_bot_pause_status_updated_at
  BEFORE UPDATE ON bot_pause_status
  FOR EACH ROW
  EXECUTE FUNCTION update_bot_pause_status_updated_at();

-- Habilitar RLS
ALTER TABLE bot_pause_status ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: Cualquier usuario autenticado puede ver el estado de pausa
CREATE POLICY "Users can view bot pause status" ON bot_pause_status
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para INSERT: Cualquier usuario autenticado puede crear estado de pausa
CREATE POLICY "Users can create bot pause status" ON bot_pause_status
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para UPDATE: Cualquier usuario autenticado puede actualizar estado de pausa
CREATE POLICY "Users can update bot pause status" ON bot_pause_status
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para DELETE: Cualquier usuario autenticado puede eliminar estado de pausa
CREATE POLICY "Users can delete bot pause status" ON bot_pause_status
  FOR DELETE USING (auth.role() = 'authenticated');

-- Comentarios
COMMENT ON TABLE bot_pause_status IS 'Estado de pausa del bot por conversación UChat';
COMMENT ON COLUMN bot_pause_status.uchat_id IS 'ID de la conversación UChat';
COMMENT ON COLUMN bot_pause_status.is_paused IS 'Si el bot está pausado';
COMMENT ON COLUMN bot_pause_status.paused_until IS 'Fecha/hora hasta cuando está pausado (NULL para indefinido)';
COMMENT ON COLUMN bot_pause_status.duration_minutes IS 'Duración de la pausa en minutos (NULL para indefinido)';

-- Verificar creación
SELECT 
    '✅ Tabla bot_pause_status creada' as resultado,
    COUNT(*)::text as total_registros
FROM bot_pause_status;

