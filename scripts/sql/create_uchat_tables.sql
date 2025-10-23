-- ============================================
-- UCHAT LIVE CHAT SYSTEM TABLES
-- Base de datos: hmmfuhqgvsehkizlfzga.supabase.co (PQNC)
-- Módulo: Live Chat con integración UChat API
-- ============================================
--
-- ⚠️ REGLAS DE ORO PARA DESARROLLADORES:
--
-- 1. Para cualquier duda consultar el archivo README: src/components/chat/README.md
--    para información técnica completa del módulo y sus funciones
--
-- 2. Cualquier cambio realizado en este archivo se debe documentar en el archivo README:
--    src/components/chat/README.md
--
-- 3. Cualquier ajuste se debe verificar en el CHANGELOG: src/components/chat/CHANGELOG_LIVECHAT.md
--    para ver si no se realizó antes, en caso de que sea nuevo debe documentarse correctamente
-- ============================================

-- Tabla para configuración de chatbots
CREATE TABLE IF NOT EXISTS uchat_bots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_name VARCHAR(255) NOT NULL,
  bot_description TEXT,
  api_key VARCHAR(500) NOT NULL,
  api_url VARCHAR(500) DEFAULT 'https://www.uchat.com.au/api',
  webhook_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  bot_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth_users(id)
);

-- Tabla para conversaciones de chat
CREATE TABLE IF NOT EXISTS uchat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id VARCHAR(255) UNIQUE NOT NULL, -- ID de UChat
  bot_id UUID REFERENCES uchat_bots(id) ON DELETE CASCADE,
  prospect_id UUID, -- Referencia a prospectos (puede ser NULL si no se encuentra)
  customer_phone VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  platform VARCHAR(50) DEFAULT 'whatsapp', -- whatsapp, telegram, etc.
  status VARCHAR(50) DEFAULT 'active', -- active, transferred, closed, archived
  assigned_agent_id UUID REFERENCES auth_users(id),
  assignment_date TIMESTAMP WITH TIME ZONE,
  handoff_enabled BOOLEAN DEFAULT false,
  handoff_triggered_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  message_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para mensajes del chat
CREATE TABLE IF NOT EXISTS uchat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE NOT NULL, -- ID de UChat
  conversation_id UUID REFERENCES uchat_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'bot', 'agent')),
  sender_id VARCHAR(255), -- ID del remitente en UChat
  sender_name VARCHAR(255),
  message_type VARCHAR(50) DEFAULT 'text', -- text, image, audio, video, document, location
  content TEXT,
  media_url VARCHAR(500),
  media_type VARCHAR(100),
  media_size INTEGER,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para asignaciones de agentes
CREATE TABLE IF NOT EXISTS uchat_agent_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES uchat_conversations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth_users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unassigned_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  assignment_reason VARCHAR(255),
  notes TEXT
);

-- Tabla para configuración de handoff automático
CREATE TABLE IF NOT EXISTS uchat_handoff_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID REFERENCES uchat_bots(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(50) NOT NULL, -- message_received, keyword_detected, time_based, manual
  trigger_conditions JSONB NOT NULL, -- Condiciones específicas del trigger
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para métricas y estadísticas
CREATE TABLE IF NOT EXISTS uchat_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID REFERENCES uchat_bots(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth_users(id),
  metric_date DATE NOT NULL,
  conversations_total INTEGER DEFAULT 0,
  conversations_assigned INTEGER DEFAULT 0,
  conversations_resolved INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0, -- en segundos
  handoffs_triggered INTEGER DEFAULT 0,
  customer_satisfaction DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para webhooks y eventos
CREATE TABLE IF NOT EXISTS uchat_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id UUID REFERENCES uchat_bots(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para uchat_conversations
CREATE INDEX IF NOT EXISTS idx_uchat_conversations_phone ON uchat_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_uchat_conversations_status ON uchat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_uchat_conversations_assigned_agent ON uchat_conversations(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_uchat_conversations_last_message ON uchat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_uchat_conversations_bot_id ON uchat_conversations(bot_id);

-- Índices para uchat_messages
CREATE INDEX IF NOT EXISTS idx_uchat_messages_conversation ON uchat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_uchat_messages_created_at ON uchat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uchat_messages_sender_type ON uchat_messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_uchat_messages_is_read ON uchat_messages(is_read);

-- Índices para uchat_agent_assignments
CREATE INDEX IF NOT EXISTS idx_uchat_assignments_conversation ON uchat_agent_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_uchat_assignments_agent ON uchat_agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_uchat_assignments_active ON uchat_agent_assignments(is_active);

-- Índices para uchat_metrics
CREATE INDEX IF NOT EXISTS idx_uchat_metrics_date ON uchat_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_uchat_metrics_bot_agent ON uchat_metrics(bot_id, agent_id);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_uchat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_uchat_bots_updated_at ON uchat_bots;
CREATE TRIGGER update_uchat_bots_updated_at
  BEFORE UPDATE ON uchat_bots
  FOR EACH ROW
  EXECUTE FUNCTION update_uchat_updated_at();

DROP TRIGGER IF EXISTS update_uchat_conversations_updated_at ON uchat_conversations;
CREATE TRIGGER update_uchat_conversations_updated_at
  BEFORE UPDATE ON uchat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_uchat_updated_at();

DROP TRIGGER IF EXISTS update_uchat_handoff_rules_updated_at ON uchat_handoff_rules;
CREATE TRIGGER update_uchat_handoff_rules_updated_at
  BEFORE UPDATE ON uchat_handoff_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_uchat_updated_at();

-- Función para actualizar contador de mensajes
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE uchat_conversations 
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE uchat_conversations 
    SET message_count = message_count - 1
    WHERE id = OLD.conversation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para actualizar contador de mensajes
DROP TRIGGER IF EXISTS update_message_count_trigger ON uchat_messages;
CREATE TRIGGER update_message_count_trigger
  AFTER INSERT OR DELETE ON uchat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_message_count();

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE uchat_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_handoff_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE uchat_webhook_events ENABLE ROW LEVEL SECURITY;

-- Políticas para uchat_bots
CREATE POLICY "Usuarios autenticados pueden ver bots" ON uchat_bots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo admins pueden modificar bots" ON uchat_bots
  FOR ALL USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'developer')
    )
  );

-- Políticas para uchat_conversations
CREATE POLICY "Usuarios pueden ver todas las conversaciones" ON uchat_conversations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar conversaciones asignadas" ON uchat_conversations
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    (assigned_agent_id = auth.uid() OR assigned_agent_id IS NULL)
  );

-- Políticas para uchat_messages
CREATE POLICY "Usuarios pueden ver mensajes de conversaciones" ON uchat_messages
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM uchat_conversations c 
      WHERE c.id = conversation_id
    )
  );

CREATE POLICY "Usuarios pueden insertar mensajes" ON uchat_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para uchat_agent_assignments
CREATE POLICY "Usuarios pueden ver asignaciones" ON uchat_agent_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden crear asignaciones" ON uchat_agent_assignments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para métricas
CREATE POLICY "Usuarios pueden ver métricas" ON uchat_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Insertar bot inicial con la API key proporcionada
INSERT INTO uchat_bots (
  bot_name, 
  bot_description, 
  api_key, 
  bot_config,
  created_by
) VALUES (
  'Bot Principal WhatsApp',
  'Bot principal para atención de prospectos vía WhatsApp',
  'hBOeQll3yFUY6Br6jHL3OPJ0fVdCXWMhRM7F3Za4AD21WCAl3Q0LEEu2nbj5',
  '{
    "auto_handoff": true,
    "handoff_trigger": "user_message",
    "supported_platforms": ["whatsapp"],
    "response_timeout": 30,
    "max_retries": 3
  }'::jsonb,
  (SELECT id FROM auth_users WHERE email = 'admin@sistema.com' LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Insertar regla de handoff automático
INSERT INTO uchat_handoff_rules (
  bot_id,
  rule_name,
  trigger_type,
  trigger_conditions
) VALUES (
  (SELECT id FROM uchat_bots WHERE bot_name = 'Bot Principal WhatsApp' LIMIT 1),
  'Handoff Automático por Mensaje de Usuario',
  'message_received',
  '{
    "sender_type": "customer",
    "auto_disable_bot": true,
    "assign_to_available_agent": true,
    "priority": "medium"
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE uchat_bots IS 'Configuración de chatbots integrados con UChat';
COMMENT ON TABLE uchat_conversations IS 'Conversaciones activas del sistema de chat';
COMMENT ON TABLE uchat_messages IS 'Mensajes individuales de las conversaciones';
COMMENT ON TABLE uchat_agent_assignments IS 'Asignaciones de conversaciones a agentes';
COMMENT ON TABLE uchat_handoff_rules IS 'Reglas para transferencia automática a agentes humanos';
COMMENT ON TABLE uchat_metrics IS 'Métricas y estadísticas del sistema de chat';
COMMENT ON TABLE uchat_webhook_events IS 'Eventos recibidos via webhooks de UChat';

COMMENT ON COLUMN uchat_conversations.handoff_enabled IS 'Indica si el bot está deshabilitado y la conversación transferida';
COMMENT ON COLUMN uchat_conversations.priority IS 'Prioridad de la conversación para asignación de agentes';
COMMENT ON COLUMN uchat_messages.is_read IS 'Indica si el mensaje ha sido leído por el agente asignado';
COMMENT ON COLUMN uchat_metrics.avg_response_time IS 'Tiempo promedio de respuesta en segundos';
