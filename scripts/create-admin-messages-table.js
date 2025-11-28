/**
 * Script para crear la tabla admin_messages en System UI
 * Usa HTTP request con las credenciales almacenadas en el proyecto
 */

const SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const SQL = `
-- Crear tabla admin_messages
CREATE TABLE IF NOT EXISTS admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(50) NOT NULL CHECK (category IN ('password_reset_request', 'user_unblock_request', 'system_alert', 'user_request')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sender_id UUID,
  sender_email VARCHAR(255),
  recipient_id UUID,
  recipient_role VARCHAR(50) DEFAULT 'admin',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'resolved', 'archived')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}',
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolved_note TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_admin_messages_status ON admin_messages(status);
CREATE INDEX IF NOT EXISTS idx_admin_messages_category ON admin_messages(category);
CREATE INDEX IF NOT EXISTS idx_admin_messages_recipient_role ON admin_messages(recipient_role);
CREATE INDEX IF NOT EXISTS idx_admin_messages_created_at ON admin_messages(created_at DESC);

-- Crear trigger para updated_at
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
ALTER PUBLICATION supabase_realtime ADD TABLE admin_messages;

-- RLS Policies
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Solo administradores pueden ver todos los mensajes
CREATE POLICY "Admins can view all messages"
  ON admin_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.role_id IN (
        SELECT id FROM auth_roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

-- Policy: Cualquiera puede crear mensajes (para que usuarios bloqueados puedan solicitar desbloqueo)
CREATE POLICY "Anyone can create messages"
  ON admin_messages FOR INSERT
  WITH CHECK (true);

-- Policy: Solo administradores pueden actualizar mensajes
CREATE POLICY "Admins can update messages"
  ON admin_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE auth_users.id = auth.uid()
      AND auth_users.role_id IN (
        SELECT id FROM auth_roles WHERE name IN ('admin', 'super_admin')
      )
    )
  );

-- Comentarios
COMMENT ON TABLE admin_messages IS 'Sistema de mensajería para administradores';
COMMENT ON COLUMN admin_messages.category IS 'Categoría del mensaje: password_reset_request, user_unblock_request, system_alert, user_request';
COMMENT ON COLUMN admin_messages.status IS 'Estado del mensaje: pending, read, resolved, archived';
COMMENT ON COLUMN admin_messages.priority IS 'Prioridad: low, normal, high, urgent';
`;

async function createTable() {
  try {
    console.log('🔄 Creando tabla admin_messages...');
    
    // Usar el endpoint de SQL directo de Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        query: SQL
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error ejecutando SQL:', errorText);
      console.log('\n📋 Por favor ejecuta el SQL manualmente en el dashboard de Supabase:');
      console.log('   https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql');
      console.log('\nSQL a ejecutar:');
      console.log(SQL);
      return;
    }

    const result = await response.json();
    console.log('✅ Tabla admin_messages creada exitosamente:', result);
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Por favor ejecuta el SQL manualmente en el dashboard de Supabase:');
    console.log('   https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql');
    console.log('\nSQL a ejecutar:');
    console.log(SQL);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createTable();
}

export { createTable, SQL };

