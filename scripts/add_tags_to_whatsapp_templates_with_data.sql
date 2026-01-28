-- ============================================
-- MIGRACIÓN COMPLETA: TAGS + ETIQUETAS INICIALES
-- ============================================
-- Script para agregar campo tags a whatsapp_templates
-- y crear etiquetas automáticas basadas en análisis de plantillas existentes
-- Ejecutar en Supabase Dashboard > SQL Editor

-- ============================================
-- PARTE 1: MIGRACIÓN DE ESTRUCTURA
-- ============================================

-- Agregar columna tags
ALTER TABLE whatsapp_templates 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Crear índice GIN para búsqueda eficiente de tags
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tags 
ON whatsapp_templates USING GIN(tags);

-- Comentario en la columna
COMMENT ON COLUMN whatsapp_templates.tags IS 
'Etiquetas de clasificación de plantillas. Máximo 18 caracteres, solo letras, números y guión bajo. Ejemplos: conciertos, reactivacion, primer_contacto, seguimiento';

-- Función para validar formato de tags
CREATE OR REPLACE FUNCTION validate_template_tag(tag TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar longitud
  IF LENGTH(tag) > 18 THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar caracteres permitidos (letras, números, guión bajo)
  IF tag !~ '^[a-zA-Z0-9_]+$' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para validar tags antes de insertar/actualizar
CREATE OR REPLACE FUNCTION validate_whatsapp_template_tags()
RETURNS TRIGGER AS $$
DECLARE
  tag TEXT;
BEGIN
  -- Verificar cada tag
  IF NEW.tags IS NOT NULL THEN
    FOREACH tag IN ARRAY NEW.tags
    LOOP
      IF NOT validate_template_tag(tag) THEN
        RAISE EXCEPTION 'Tag inválido: "%". Las tags deben tener máximo 18 caracteres y solo contener letras, números y guión bajo (_)', tag;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_whatsapp_template_tags ON whatsapp_templates;
CREATE TRIGGER trg_validate_whatsapp_template_tags
  BEFORE INSERT OR UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION validate_whatsapp_template_tags();

-- Vista para obtener tags más usados
-- ⚠️ IMPORTANTE: Solo accesible para usuarios autenticados
CREATE OR REPLACE VIEW v_whatsapp_template_tags_stats AS
SELECT 
  unnest(tags) as tag,
  COUNT(*) as usage_count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates_count
FROM whatsapp_templates
WHERE tags IS NOT NULL 
  AND array_length(tags, 1) > 0
  AND is_deleted IS NOT TRUE
GROUP BY unnest(tags)
ORDER BY usage_count DESC;

COMMENT ON VIEW v_whatsapp_template_tags_stats IS 
'Estadísticas de uso de tags en plantillas WhatsApp. SOLO usuarios autenticados.';

-- 🔒 SEGURIDAD: Revocar acceso público y dar acceso solo a autenticados
REVOKE ALL ON v_whatsapp_template_tags_stats FROM anon;
REVOKE ALL ON v_whatsapp_template_tags_stats FROM public;
GRANT SELECT ON v_whatsapp_template_tags_stats TO authenticated;
GRANT SELECT ON v_whatsapp_template_tags_stats TO service_role;

-- ============================================
-- PARTE 2: ASIGNACIÓN AUTOMÁTICA DE ETIQUETAS
-- ============================================

-- Conciertos y eventos especiales
UPDATE whatsapp_templates 
SET tags = ARRAY['conciertos', 'eventos', 'exclusivo']
WHERE name IN ('michael_buble_en_vidanta', 'sumergete_en_lo_inalcanzable_ludo', 'el_buki_en_vidanta')
  AND (tags IS NULL OR array_length(tags, 1) = 0);

-- Reactivación y reenganche
UPDATE whatsapp_templates 
SET tags = ARRAY['reactivacion', 'seguimiento']
WHERE name IN ('reenganche_suave', 'retomar_saludo', 'ultima_oportunidad')
  AND (tags IS NULL OR array_length(tags, 1) = 0);

-- Intento de llamada
UPDATE whatsapp_templates 
SET tags = ARRAY['llamada', 'seguimiento']
WHERE name IN ('intento_llamada_no_exitoso', 'intento_llamada', 'intento_llamada_no_exitosa')
  AND (tags IS NULL OR array_length(tags, 1) = 0);

-- Parejas y romántico
UPDATE whatsapp_templates 
SET tags = ARRAY['parejas', 'romantico']
WHERE name IN ('escapada_romantica', 'viaje_en_pareja')
  AND (tags IS NULL OR array_length(tags, 1) = 0);

-- Primer contacto y curiosidad
UPDATE whatsapp_templates 
SET tags = ARRAY['primer_contacto', 'interes']
WHERE name IN ('curiosidad_pura_1', 'en_3minutos')
  AND (tags IS NULL OR array_length(tags, 1) = 0);

-- Datos y contacto
UPDATE whatsapp_templates 
SET tags = ARRAY['contacto', 'datos']
WHERE name IN ('datos_contacto', 'agendar_llamada')
  AND (tags IS NULL OR array_length(tags, 1) = 0);

-- Negociación y ofertas
UPDATE whatsapp_templates 
SET tags = ARRAY['negociacion', 'oferta']
WHERE name IN ('contrapropuesta', 'liberacion_de_disponibilidad')
  AND (tags IS NULL OR array_length(tags, 1) = 0);

-- Testing
UPDATE whatsapp_templates 
SET tags = ARRAY['test']
WHERE name IN ('imagen_test')
  AND (tags IS NULL OR array_length(tags, 1) = 0);

-- ============================================
-- PARTE 3: VERIFICACIÓN
-- ============================================

-- Ver resumen de tags asignados
SELECT 
  name,
  tags,
  description,
  category,
  status
FROM whatsapp_templates
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
ORDER BY name;

-- Ver estadísticas de tags
SELECT * FROM v_whatsapp_template_tags_stats;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- 18 plantillas con tags asignados
-- Tags creados: conciertos, eventos, exclusivo, reactivacion, seguimiento,
--               llamada, parejas, romantico, primer_contacto, interes,
--               contacto, datos, negociacion, oferta, test
