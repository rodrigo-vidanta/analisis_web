-- ============================================
-- CREAR TABLA user_notifications EN SYSTEMUI
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Ejecutar en SQL Editor de Supabase SystemUI
-- ============================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('new_message', 'new_call')),
  module VARCHAR(50) NOT NULL CHECK (module IN ('live-chat', 'live-monitor')),
  message_id UUID,
  conversation_id UUID,
  prospect_id UUID,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  message_preview TEXT,
  call_id VARCHAR(255),
  call_status VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_module ON user_notifications(module);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Habilitar Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
        RAISE NOTICE '✅ Realtime habilitado en user_notifications';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ user_notifications ya tiene realtime habilitado';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error habilitando realtime: %', SQLERRM;
    END;
END $$;

-- Habilitar RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Crear políticas si no existen
DO $$
BEGIN
    -- Política para SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_notifications' 
        AND policyname = 'Users can view own notifications'
    ) THEN
        CREATE POLICY "Users can view own notifications" ON user_notifications
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    -- Política para UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_notifications' 
        AND policyname = 'Users can update own notifications'
    ) THEN
        CREATE POLICY "Users can update own notifications" ON user_notifications
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    -- Política para INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_notifications' 
        AND policyname = 'Service can insert notifications'
    ) THEN
        CREATE POLICY "Service can insert notifications" ON user_notifications
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Comentarios
COMMENT ON TABLE user_notifications IS 'Notificaciones en tiempo real para usuarios autenticados';
COMMENT ON COLUMN user_notifications.notification_type IS 'Tipo de notificación: new_message o new_call';
COMMENT ON COLUMN user_notifications.module IS 'Módulo origen: live-chat o live-monitor';

-- Verificar creación
SELECT 
    '✅ Tabla user_notifications creada' as resultado,
    COUNT(*)::text as total_notificaciones
FROM user_notifications;

