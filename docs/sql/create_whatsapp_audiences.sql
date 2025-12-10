-- ============================================
-- TABLA DE AUDIENCIAS PARA PLANTILLAS WHATSAPP
-- ============================================
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- Proyecto: pqnc_ai (glsmifhkoaifvaegsozd)
-- Fecha: 2025-12-10
-- ============================================

-- Tabla de audiencias
CREATE TABLE IF NOT EXISTS whatsapp_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información básica
  nombre VARCHAR(100) NOT NULL,
  descripcion VARCHAR(300),
  
  -- Segmentación
  etapa VARCHAR(50),
  destino VARCHAR(50),
  estado_civil VARCHAR(30),
  
  -- Tipo de audiencia (selección múltiple almacenada como array)
  -- Valores posibles: familia, pareja, solo, amigos, grupo
  tipo_audiencia VARCHAR(30)[] DEFAULT '{}',
  
  -- Preferencias
  preferencia_entretenimiento VARCHAR(20), -- entretenimiento, descanso, mixto
  
  -- Conteo de prospectos que coinciden (se calcula dinámicamente)
  prospectos_count INTEGER DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_active ON whatsapp_audiences(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_nombre ON whatsapp_audiences(nombre);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_etapa ON whatsapp_audiences(etapa);
CREATE INDEX IF NOT EXISTS idx_whatsapp_audiences_destino ON whatsapp_audiences(destino);

-- Comentarios de documentación
COMMENT ON TABLE whatsapp_audiences IS 'Audiencias segmentadas para plantillas de WhatsApp. Permite definir segmentos de prospectos para envío masivo de mensajes.';
COMMENT ON COLUMN whatsapp_audiences.nombre IS 'Nombre identificador de la audiencia';
COMMENT ON COLUMN whatsapp_audiences.descripcion IS 'Descripción detallada de la audiencia (máx 300 caracteres)';
COMMENT ON COLUMN whatsapp_audiences.tipo_audiencia IS 'Array con tipos de audiencia: familia, pareja, solo, amigos, grupo';
COMMENT ON COLUMN whatsapp_audiences.prospectos_count IS 'Conteo de prospectos que coinciden con los criterios';

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_whatsapp_audiences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_whatsapp_audiences_updated_at ON whatsapp_audiences;
CREATE TRIGGER trigger_update_whatsapp_audiences_updated_at
  BEFORE UPDATE ON whatsapp_audiences
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_audiences_updated_at();

-- Habilitar RLS
ALTER TABLE whatsapp_audiences ENABLE ROW LEVEL SECURITY;

-- Política de acceso (usuarios autenticados pueden ver y editar)
CREATE POLICY "Authenticated users can manage audiences" ON whatsapp_audiences
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para service role (acceso completo)
CREATE POLICY "Service role full access" ON whatsapp_audiences
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FUNCIÓN PARA CONTAR PROSPECTOS POR AUDIENCIA
-- ============================================

CREATE OR REPLACE FUNCTION count_prospectos_for_audience(
  p_etapa VARCHAR DEFAULT NULL,
  p_destino VARCHAR DEFAULT NULL,
  p_estado_civil VARCHAR DEFAULT NULL,
  p_tipo_audiencia VARCHAR[] DEFAULT NULL,
  p_preferencia_entretenimiento VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Construir query dinámica basada en los parámetros
  SELECT COUNT(*) INTO v_count
  FROM prospectos p
  LEFT JOIN llamadas_ventas lv ON lv.prospecto_id = p.id
  WHERE 
    (p_etapa IS NULL OR p.etapa = p_etapa)
    AND (p_destino IS NULL OR lv.destino_preferido = p_destino)
    AND (p_estado_civil IS NULL OR lv.estado_civil = p_estado_civil)
    AND (p_preferencia_entretenimiento IS NULL OR lv.preferencia_vacaciones = p_preferencia_entretenimiento);
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar acceso a la función
GRANT EXECUTE ON FUNCTION count_prospectos_for_audience TO authenticated;
GRANT EXECUTE ON FUNCTION count_prospectos_for_audience TO service_role;

-- ============================================
-- DATOS INICIALES (OPCIONAL)
-- ============================================

-- Insertar algunas audiencias de ejemplo
-- INSERT INTO whatsapp_audiences (nombre, descripcion, etapa, destino, tipo_audiencia)
-- VALUES 
--   ('Interesados Riviera Maya', 'Prospectos interesados en Riviera Maya', 'Interesado', 'Riviera Maya', ARRAY['familia', 'pareja']),
--   ('Seguimiento Post-Llamada', 'Prospectos que atendieron llamada pero no cerraron', 'Atendió llamada', NULL, ARRAY['familia', 'pareja', 'grupo']),
--   ('Luna de Miel Los Cabos', 'Parejas interesadas en luna de miel', 'Interesado', 'Los Cabos', ARRAY['pareja']);


