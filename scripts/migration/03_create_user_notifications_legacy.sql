-- ============================================
-- SCRIPT 03: CREAR TABLA user_notifications_legacy
-- ============================================
-- Ejecutar en: pqnc_ai (glsmifhkoaifvaegsozd.supabase.co)
-- Fecha: 2025-01-13
-- Propósito: Crear tabla para migrar datos legacy de system_ui

-- ============================================
-- CREAR TABLA CON ESTRUCTURA DE SYSTEM_UI
-- ============================================

CREATE TABLE IF NOT EXISTS user_notifications_legacy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type VARCHAR NOT NULL,
    module VARCHAR NOT NULL,
    message_id UUID,
    conversation_id UUID,
    call_id VARCHAR,
    prospect_id UUID,
    customer_name VARCHAR,
    customer_phone VARCHAR,
    message_preview TEXT,
    call_status VARCHAR,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_muted BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- CREAR ÍNDICES PARA RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_user_id 
ON user_notifications_legacy(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_is_read 
ON user_notifications_legacy(is_read);

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_created_at 
ON user_notifications_legacy(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_conversation_id 
ON user_notifications_legacy(conversation_id) WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_call_id 
ON user_notifications_legacy(call_id) WHERE call_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_prospect_id 
ON user_notifications_legacy(prospect_id) WHERE prospect_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_legacy_notification_type 
ON user_notifications_legacy(notification_type);

-- ============================================
-- CREAR TRIGGER PARA updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_user_notifications_legacy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_notifications_legacy_updated_at ON user_notifications_legacy;

CREATE TRIGGER trigger_update_user_notifications_legacy_updated_at
BEFORE UPDATE ON user_notifications_legacy
FOR EACH ROW
EXECUTE FUNCTION update_user_notifications_legacy_updated_at();

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE user_notifications_legacy IS 
'Tabla legacy de notificaciones migrada desde system_ui. Estructura original preservada para referencia histórica. Esta tabla contiene notificaciones con estructura antigua (18 columnas) mientras que user_notifications tiene estructura nueva (11 columnas).';

COMMENT ON COLUMN user_notifications_legacy.notification_type IS 
'Tipo de notificación: new_message, new_call';

COMMENT ON COLUMN user_notifications_legacy.module IS 
'Módulo origen: live-chat, live-monitor';

COMMENT ON COLUMN user_notifications_legacy.is_muted IS 
'Indica si la notificación está silenciada por el usuario';

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que la tabla se creó correctamente
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_notifications_legacy'
ORDER BY ordinal_position;

-- Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications_legacy'
ORDER BY indexname;

-- Verificar trigger
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
  AND event_object_table = 'user_notifications_legacy';
