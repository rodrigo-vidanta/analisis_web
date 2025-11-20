-- ============================================
-- TABLA DE NOTIFICACIONES POR USUARIO
-- Base de datos: system_ui
-- Propósito: Notificaciones en tiempo real para mensajes y llamadas
-- ============================================

-- Tabla principal de notificaciones
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- ID del usuario autenticado
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('new_message', 'new_call')),
  module VARCHAR(50) NOT NULL CHECK (module IN ('live-chat', 'live-monitor')),
  
  -- Datos específicos del mensaje
  message_id UUID, -- ID del mensaje en mensajes_whatsapp o uchat_messages
  conversation_id UUID, -- ID de la conversación
  prospect_id UUID, -- ID del prospecto/cliente
  customer_name VARCHAR(255), -- Nombre del cliente
  customer_phone VARCHAR(50), -- Teléfono del cliente
  message_preview TEXT, -- Vista previa del mensaje (primeros 100 caracteres)
  
  -- Datos específicos de la llamada
  call_id VARCHAR(255), -- ID de la llamada en llamadas_ventas
  call_status VARCHAR(50), -- Estado de la llamada
  
  -- Metadatos
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para optimización
  CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_module ON user_notifications(module);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Habilitar Realtime para la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- Comentarios para documentación
COMMENT ON TABLE user_notifications IS 'Notificaciones en tiempo real para usuarios autenticados';
COMMENT ON COLUMN user_notifications.notification_type IS 'Tipo de notificación: new_message o new_call';
COMMENT ON COLUMN user_notifications.module IS 'Módulo origen: live-chat o live-monitor';
COMMENT ON COLUMN user_notifications.is_read IS 'Indica si la notificación ha sido leída';
COMMENT ON COLUMN user_notifications.read_at IS 'Timestamp de cuando se marcó como leída';

-- Función para limpiar notificaciones antiguas (más de 7 días)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM user_notifications
  WHERE created_at < NOW() - INTERVAL '7 days'
  AND is_read = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ejecutar limpieza automática (opcional, puede ejecutarse manualmente)
-- Se puede configurar un cron job en Supabase para ejecutar esta función periódicamente

