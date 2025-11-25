-- ============================================
-- TABLA DE NOTIFICACIONES POR USUARIO
-- ============================================
-- Almacena notificaciones individuales por usuario
-- Permite que cada usuario vea solo sus notificaciones según permisos
-- y las marque como leídas independientemente

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('new_message', 'new_call')),
  module VARCHAR(50) NOT NULL CHECK (module IN ('live-chat', 'live-monitor')),
  
  -- Referencias a los datos originales
  message_id UUID, -- ID del mensaje en mensajes_whatsapp
  conversation_id UUID, -- ID de la conversación en uchat_conversations
  call_id VARCHAR(255), -- call_id de llamadas_ventas
  prospect_id UUID, -- ID del prospecto relacionado
  
  -- Información para mostrar
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  message_preview TEXT,
  call_status VARCHAR(50),
  
  -- Estado de la notificación
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Silenciar notificaciones (no reproducir sonido)
  is_muted BOOLEAN DEFAULT false,
  
  -- Metadatos adicionales
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_message_id ON user_notifications(message_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_call_id ON user_notifications(call_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_prospect_id ON user_notifications(prospect_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_user_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_notifications_updated_at
  BEFORE UPDATE ON user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notifications_updated_at();

-- Políticas RLS (Row Level Security)
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "Users can view their own notifications"
  ON user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios pueden actualizar sus propias notificaciones
CREATE POLICY "Users can update their own notifications"
  ON user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Solo el sistema puede insertar notificaciones (usando service_role)
-- Esta política permite que el backend inserte notificaciones para cualquier usuario
CREATE POLICY "System can insert notifications"
  ON user_notifications
  FOR INSERT
  WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE user_notifications IS 'Notificaciones individuales por usuario para mensajes nuevos y llamadas activas';
COMMENT ON COLUMN user_notifications.is_muted IS 'Si es true, no se reproduce sonido para esta notificación';
COMMENT ON COLUMN user_notifications.notification_type IS 'Tipo: new_message o new_call';
COMMENT ON COLUMN user_notifications.module IS 'Módulo relacionado: live-chat o live-monitor';
