-- ============================================
-- CREAR TABLA admin_messages EN SYSTEMUI
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Ejecutar en SQL Editor de Supabase SystemUI
-- ============================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(50) NOT NULL CHECK (category IN ('password_reset_request', 'user_unblock_request', 'system_alert', 'user_request')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sender_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  sender_email VARCHAR(255),
  recipient_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  recipient_role VARCHAR(50), -- 'admin' o roles específicos que pueden recibir
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'resolved', 'archived')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}', -- Datos adicionales: error_message, user_email, etc.
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  resolved_note TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_admin_messages_category ON admin_messages(category);
CREATE INDEX IF NOT EXISTS idx_admin_messages_status ON admin_messages(status);
CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient ON admin_messages(recipient_id, status) WHERE recipient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient_role ON admin_messages(recipient_role, status) WHERE recipient_role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_messages_sender ON admin_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON admin_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_messages_unread ON admin_messages(recipient_role, status) WHERE status = 'pending' AND recipient_role IS NOT NULL;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_admin_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admin_messages_updated_at ON admin_messages;
CREATE TRIGGER trigger_update_admin_messages_updated_at
  BEFORE UPDATE ON admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_messages_updated_at();

-- Habilitar Realtime
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE admin_messages;
        RAISE NOTICE '✅ Realtime habilitado en admin_messages';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ admin_messages ya tiene realtime habilitado';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error habilitando realtime: %', SQLERRM;
    END;
END $$;

-- Habilitar RLS
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Crear políticas
DO $$
BEGIN
    -- Política para SELECT: Admins pueden ver todos los mensajes dirigidos a ellos
    -- Simplificada: cualquier usuario autenticado puede ver mensajes dirigidos a 'admin'
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'admin_messages' 
        AND policyname = 'Admins can view messages'
    ) THEN
        CREATE POLICY "Admins can view messages" ON admin_messages
            FOR SELECT USING (
                recipient_role = 'admin' OR 
                recipient_id = auth.uid() OR
                sender_id = auth.uid()
            );
    END IF;
    
    -- Política para UPDATE: Solo admins pueden actualizar mensajes
    -- Simplificada: permitir actualización si el mensaje está dirigido a 'admin'
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'admin_messages' 
        AND policyname = 'Admins can update messages'
    ) THEN
        CREATE POLICY "Admins can update messages" ON admin_messages
            FOR UPDATE USING (
                recipient_role = 'admin'
            );
    END IF;
    
    -- Política para INSERT: Cualquiera puede crear mensajes (para password reset, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'admin_messages' 
        AND policyname = 'Anyone can create messages'
    ) THEN
        CREATE POLICY "Anyone can create messages" ON admin_messages
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Comentarios
COMMENT ON TABLE admin_messages IS 'Sistema de mensajería para administradores con categorías y permisos';
COMMENT ON COLUMN admin_messages.category IS 'Categoría del mensaje: password_reset_request, user_unblock_request, system_alert, user_request';
COMMENT ON COLUMN admin_messages.recipient_role IS 'Rol que puede recibir el mensaje (admin, administrador_operativo, etc.)';
COMMENT ON COLUMN admin_messages.metadata IS 'Datos adicionales JSON: error_message, user_email, login_attempts, etc.';

-- Verificar creación
SELECT 
    '✅ Tabla admin_messages creada' as resultado,
    COUNT(*)::text as total_mensajes
FROM admin_messages;

