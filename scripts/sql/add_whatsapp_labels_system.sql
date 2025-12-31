-- ============================================
-- SISTEMA DE ETIQUETAS PARA WHATSAPP
-- Base de Datos: SYSTEM_UI (zbylezfyagwrxoecioup)
-- ============================================
-- Fecha: 29 Diciembre 2025
-- Versión: 1.0.0
-- ============================================
--
-- ARQUITECTURA:
-- - Etiquetas (preset y custom) en SYSTEM_UI (donde están los usuarios)
-- - Relación prospecto-etiquetas en SYSTEM_UI
-- - Los prospectos están en PQNC_AI (glsmifhkoaifvaegsozd)
-- - Se hace join al cargar conversaciones (ya se hacen cross-database queries)
-- ============================================

-- ============================================
-- 1. TABLA DE ETIQUETAS PREDEFINIDAS
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_labels_preset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7) NOT NULL, -- Hexadecimal (#RRGGBB)
  icon VARCHAR(50), -- Nombre del icono lucide-react
  description TEXT,
  business_rule VARCHAR(50), -- 'positive', 'negative', 'neutral'
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_labels_preset_active 
  ON whatsapp_labels_preset(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_labels_preset_order 
  ON whatsapp_labels_preset(display_order);

-- ============================================
-- 2. TABLA DE ETIQUETAS PERSONALIZADAS
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_labels_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Restricción: nombre único por usuario
  CONSTRAINT unique_user_label_name UNIQUE(user_id, name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_labels_custom_user 
  ON whatsapp_labels_custom(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_labels_custom_active 
  ON whatsapp_labels_custom(user_id, is_active);

-- ============================================
-- 3. TABLA DE RELACIÓN PROSPECTO-ETIQUETAS
-- ============================================
-- NOTA: prospecto_id referencia a prospectos en PQNC_AI
-- No podemos usar FOREIGN KEY cross-database, solo validación en código

CREATE TABLE IF NOT EXISTS whatsapp_conversation_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id UUID NOT NULL, -- ID del prospecto en PQNC_AI
  label_id UUID NOT NULL, -- ID de la etiqueta (preset o custom)
  label_type VARCHAR(10) NOT NULL CHECK (label_type IN ('preset', 'custom')),
  shadow_cell BOOLEAN DEFAULT false,
  added_by UUID REFERENCES auth_users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Restricción: no duplicar etiqueta en el mismo prospecto
  CONSTRAINT unique_prospecto_label UNIQUE(prospecto_id, label_id, label_type)
);

-- Índices optimizados
CREATE INDEX IF NOT EXISTS idx_conv_labels_prospecto 
  ON whatsapp_conversation_labels(prospecto_id);
CREATE INDEX IF NOT EXISTS idx_conv_labels_label 
  ON whatsapp_conversation_labels(label_id, label_type);
CREATE INDEX IF NOT EXISTS idx_conv_labels_shadow 
  ON whatsapp_conversation_labels(prospecto_id, shadow_cell);
CREATE INDEX IF NOT EXISTS idx_conv_labels_composite 
  ON whatsapp_conversation_labels(prospecto_id, label_type, label_id);

-- ============================================
-- 4. TRIGGERS Y FUNCIONES DE VALIDACIÓN
-- ============================================

-- Validar máximo 6 etiquetas personalizadas por usuario
CREATE OR REPLACE FUNCTION check_max_custom_labels()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM whatsapp_labels_custom 
      WHERE user_id = NEW.user_id AND is_active = true) >= 6 THEN
    RAISE EXCEPTION 'No puedes crear más de 6 etiquetas personalizadas';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_max_custom_labels ON whatsapp_labels_custom;
CREATE TRIGGER trigger_max_custom_labels
BEFORE INSERT ON whatsapp_labels_custom
FOR EACH ROW
EXECUTE FUNCTION check_max_custom_labels();

-- Validar máximo 3 etiquetas por prospecto
CREATE OR REPLACE FUNCTION check_max_labels_per_prospecto()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM whatsapp_conversation_labels 
      WHERE prospecto_id = NEW.prospecto_id) >= 3 THEN
    RAISE EXCEPTION 'No puedes agregar más de 3 etiquetas a una conversación';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_max_labels_per_prospecto ON whatsapp_conversation_labels;
CREATE TRIGGER trigger_max_labels_per_prospecto
BEFORE INSERT ON whatsapp_conversation_labels
FOR EACH ROW
EXECUTE FUNCTION check_max_labels_per_prospecto();

-- Validar etiquetas contradictorias
CREATE OR REPLACE FUNCTION check_conflicting_labels()
RETURNS TRIGGER AS $$
DECLARE
  new_label_rule VARCHAR(50);
BEGIN
  -- Solo validar si es etiqueta preset
  IF NEW.label_type = 'preset' THEN
    SELECT business_rule INTO new_label_rule
    FROM whatsapp_labels_preset
    WHERE id = NEW.label_id;
    
    -- Verificar conflictos positive vs negative
    IF new_label_rule = 'positive' THEN
      IF EXISTS (
        SELECT 1 FROM whatsapp_conversation_labels wcl
        JOIN whatsapp_labels_preset wlp ON wcl.label_id = wlp.id
        WHERE wcl.prospecto_id = NEW.prospecto_id
        AND wcl.label_type = 'preset'
        AND wlp.business_rule = 'negative'
      ) THEN
        RAISE EXCEPTION 'No puedes agregar una etiqueta positiva si ya existe una negativa';
      END IF;
    ELSIF new_label_rule = 'negative' THEN
      IF EXISTS (
        SELECT 1 FROM whatsapp_conversation_labels wcl
        JOIN whatsapp_labels_preset wlp ON wcl.label_id = wlp.id
        WHERE wcl.prospecto_id = NEW.prospecto_id
        AND wcl.label_type = 'preset'
        AND wlp.business_rule = 'positive'
      ) THEN
        RAISE EXCEPTION 'No puedes agregar una etiqueta negativa si ya existe una positiva';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_conflicting_labels ON whatsapp_conversation_labels;
CREATE TRIGGER trigger_check_conflicting_labels
BEFORE INSERT ON whatsapp_conversation_labels
FOR EACH ROW
EXECUTE FUNCTION check_conflicting_labels();

-- Actualizar updated_at en etiquetas
CREATE OR REPLACE FUNCTION update_whatsapp_labels_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_preset_labels_updated_at ON whatsapp_labels_preset;
CREATE TRIGGER update_preset_labels_updated_at
BEFORE UPDATE ON whatsapp_labels_preset
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_labels_timestamp();

DROP TRIGGER IF EXISTS update_custom_labels_updated_at ON whatsapp_labels_custom;
CREATE TRIGGER update_custom_labels_updated_at
BEFORE UPDATE ON whatsapp_labels_custom
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_labels_timestamp();

-- ============================================
-- 5. FUNCIONES RPC PARA LA UI
-- ============================================

-- Obtener etiquetas disponibles para un usuario
CREATE OR REPLACE FUNCTION get_available_labels_for_user(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'preset', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', id::text,
          'name', name,
          'color', color,
          'icon', icon,
          'description', description,
          'business_rule', business_rule,
          'type', 'preset'
        ) ORDER BY display_order
      )
      FROM whatsapp_labels_preset
      WHERE is_active = true
    ), '[]'::json),
    'custom', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', id::text,
          'name', name,
          'color', color,
          'description', description,
          'type', 'custom'
        ) ORDER BY created_at DESC
      )
      FROM whatsapp_labels_custom
      WHERE user_id = p_user_id AND is_active = true
    ), '[]'::json)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtener etiquetas de un prospecto
CREATE OR REPLACE FUNCTION get_prospecto_labels(p_prospecto_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', wcl.id::text,
        'label_id', wcl.label_id::text,
        'label_type', wcl.label_type,
        'shadow_cell', wcl.shadow_cell,
        'name', COALESCE(wlp.name, wlc.name, 'Etiqueta eliminada'),
        'color', COALESCE(wlp.color, wlc.color, '#6B7280'),
        'icon', wlp.icon,
        'business_rule', wlp.business_rule
      )
    )
    FROM whatsapp_conversation_labels wcl
    LEFT JOIN whatsapp_labels_preset wlp 
      ON wcl.label_type = 'preset' AND wcl.label_id = wlp.id
    LEFT JOIN whatsapp_labels_custom wlc 
      ON wcl.label_type = 'custom' AND wcl.label_id = wlc.id
    WHERE wcl.prospecto_id = p_prospecto_id
  ), '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agregar etiqueta a prospecto
CREATE OR REPLACE FUNCTION add_label_to_prospecto(
  p_prospecto_id UUID,
  p_label_id UUID,
  p_label_type VARCHAR(10),
  p_shadow_cell BOOLEAN,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  label_name TEXT;
  label_color TEXT;
BEGIN
  -- Validar que la etiqueta existe
  IF p_label_type = 'preset' THEN
    SELECT name, color INTO label_name, label_color
    FROM whatsapp_labels_preset
    WHERE id = p_label_id AND is_active = true;
  ELSE
    SELECT name, color INTO label_name, label_color
    FROM whatsapp_labels_custom
    WHERE id = p_label_id AND user_id = p_user_id AND is_active = true;
  END IF;
  
  IF label_name IS NULL THEN
    RAISE EXCEPTION 'La etiqueta no existe o no está activa';
  END IF;
  
  -- Si shadow_cell es true, desactivar shadow en otras etiquetas
  IF p_shadow_cell THEN
    UPDATE whatsapp_conversation_labels
    SET shadow_cell = false
    WHERE prospecto_id = p_prospecto_id;
  END IF;
  
  -- Insertar o actualizar
  INSERT INTO whatsapp_conversation_labels (
    prospecto_id, label_id, label_type, shadow_cell, added_by
  ) VALUES (
    p_prospecto_id, p_label_id, p_label_type, p_shadow_cell, p_user_id
  )
  ON CONFLICT (prospecto_id, label_id, label_type) 
  DO UPDATE SET shadow_cell = p_shadow_cell;
  
  RETURN json_build_object(
    'label_id', p_label_id::text,
    'label_type', p_label_type,
    'shadow_cell', p_shadow_cell,
    'name', label_name,
    'color', label_color
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover etiqueta de prospecto
CREATE OR REPLACE FUNCTION remove_label_from_prospecto(
  p_prospecto_id UUID,
  p_label_id UUID,
  p_label_type VARCHAR(10)
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM whatsapp_conversation_labels
  WHERE prospecto_id = p_prospecto_id
    AND label_id = p_label_id
    AND label_type = p_label_type;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. DATOS INICIALES - ETIQUETAS PREDEFINIDAS
-- ============================================

INSERT INTO whatsapp_labels_preset (name, color, icon, description, business_rule, display_order) 
VALUES
  ('Nuevo Lead', '#3B82F6', 'user-plus', 'Prospecto nuevo sin gestionar', 'neutral', 1),
  ('En Seguimiento', '#F59E0B', 'clock', 'Prospecto en proceso de seguimiento', 'neutral', 2),
  ('Reservación Concretada', '#10B981', 'check-circle', 'Cliente ha concretado una reservación', 'positive', 3),
  ('No Interesado', '#EF4444', 'x-circle', 'Cliente no está interesado en el servicio', 'negative', 4),
  ('Pendiente de Pago', '#8B5CF6', 'credit-card', 'Cliente pendiente de realizar pago', 'neutral', 5),
  ('Reagendar', '#F97316', 'calendar', 'Necesita reagendar cita o llamada', 'neutral', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. POLÍTICAS RLS
-- ============================================

ALTER TABLE whatsapp_labels_preset ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_labels_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_labels ENABLE ROW LEVEL SECURITY;

-- Políticas para etiquetas preset (todos pueden ver)
CREATE POLICY "Usuarios pueden ver etiquetas preset" 
  ON whatsapp_labels_preset FOR SELECT
  USING (auth.role() = 'authenticated');

-- Políticas para etiquetas custom (solo el dueño)
CREATE POLICY "Usuarios pueden ver sus etiquetas custom" 
  ON whatsapp_labels_custom FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear etiquetas custom" 
  ON whatsapp_labels_custom FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus etiquetas custom" 
  ON whatsapp_labels_custom FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus etiquetas custom" 
  ON whatsapp_labels_custom FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para relación prospecto-etiquetas
CREATE POLICY "Usuarios pueden ver etiquetas de prospectos" 
  ON whatsapp_conversation_labels FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden agregar etiquetas" 
  ON whatsapp_conversation_labels FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar etiquetas" 
  ON whatsapp_conversation_labels FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden eliminar etiquetas" 
  ON whatsapp_conversation_labels FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================
-- 8. COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE whatsapp_labels_preset IS 'Etiquetas predefinidas del sistema para conversaciones de WhatsApp (máximo 6)';
COMMENT ON TABLE whatsapp_labels_custom IS 'Etiquetas personalizadas creadas por usuarios (máximo 6 por usuario)';
COMMENT ON TABLE whatsapp_conversation_labels IS 'Relación many-to-many entre prospectos y etiquetas (máximo 3 por prospecto)';

COMMENT ON COLUMN whatsapp_labels_preset.business_rule IS 'Regla de negocio: positive (éxito), negative (rechazo), neutral (proceso)';
COMMENT ON COLUMN whatsapp_conversation_labels.shadow_cell IS 'Sombrear el card de la conversación con el color de esta etiqueta';
COMMENT ON COLUMN whatsapp_conversation_labels.prospecto_id IS 'ID del prospecto en PQNC_AI (glsmifhkoaifvaegsozd)';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

