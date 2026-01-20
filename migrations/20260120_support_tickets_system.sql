-- ============================================
-- SISTEMA DE GESTIÓN DE TICKETS / SOPORTE
-- ============================================
-- Fecha: 2026-01-20
-- Autor: AI Division
-- Project: PQNC_AI (glsmifhkoaifvaegsozd)
-- Estado: ✅ EJECUTADO via Supabase Management API
-- 
-- Tablas creadas:
--   - support_tickets (tickets principales)
--   - support_ticket_comments (respuestas y comentarios)
--   - support_ticket_history (historial de cambios)
--   - support_ticket_attachments (archivos adjuntos)
--
-- RLS habilitado con políticas:
--   - Usuarios pueden ver/crear sus propios tickets
--   - Admins tienen acceso completo
--   - Comentarios internos solo visibles para admins

-- Tabla principal de tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number VARCHAR(20) UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('reporte_falla', 'requerimiento')),
  category VARCHAR(50),
  subcategory VARCHAR(100),
  status VARCHAR(20) DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_progreso', 'pendiente_info', 'resuelto', 'cerrado', 'cancelado')),
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('baja', 'normal', 'alta', 'urgente')),
  
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  app_version VARCHAR(50),
  user_agent TEXT,
  current_module VARCHAR(50),
  prospecto_id UUID,
  prospecto_nombre VARCHAR(200),
  session_details JSONB,
  
  screenshot_url TEXT,
  screenshot_base64 TEXT,
  
  form_data JSONB,
  
  reporter_id UUID NOT NULL,
  reporter_name VARCHAR(200),
  reporter_email VARCHAR(200),
  reporter_role VARCHAR(50),
  
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_tickets_reporter ON support_tickets(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_type ON support_tickets(type);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON support_tickets(created_at DESC);

-- Tabla de comentarios/respuestas
CREATE TABLE IF NOT EXISTS support_ticket_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name VARCHAR(200),
  user_role VARCHAR(50),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_ticket ON support_ticket_comments(ticket_id);

-- Tabla de historial de cambios de estado
CREATE TABLE IF NOT EXISTS support_ticket_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name VARCHAR(200),
  action VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_ticket ON support_ticket_history(ticket_id);

-- Tabla de adjuntos adicionales
CREATE TABLE IF NOT EXISTS support_ticket_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  file_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_ticket ON support_ticket_attachments(ticket_id);

-- Función para generar número de ticket automáticamente
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  today_date TEXT;
  seq_num INTEGER;
  new_ticket_number TEXT;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 14 FOR 4) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM support_tickets
  WHERE ticket_number LIKE 'TKT-' || today_date || '-%';
  
  new_ticket_number := 'TKT-' || today_date || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.ticket_number := new_ticket_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número de ticket
DROP TRIGGER IF EXISTS trigger_generate_ticket_number ON support_tickets;
CREATE TRIGGER trigger_generate_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
  EXECUTE FUNCTION generate_ticket_number();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ticket_updated_at ON support_tickets;
CREATE TRIGGER trigger_update_ticket_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_updated_at();

-- Habilitar RLS en todas las tablas
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver sus propios tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT
  USING (auth.uid()::text = reporter_id::text);

-- Política: Usuarios pueden crear tickets
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT
  WITH CHECK (auth.uid()::text = reporter_id::text);

-- Política: Admins pueden ver todos los tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id::text = auth.uid()::text
      AND (role_name = 'admin' OR role_name = 'administrador_operativo')
    )
  );

-- Política: Usuarios pueden ver comentarios de sus tickets (no internos)
DROP POLICY IF EXISTS "Users can view comments on own tickets" ON support_ticket_comments;
CREATE POLICY "Users can view comments on own tickets" ON support_ticket_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND reporter_id::text = auth.uid()::text
    )
    AND is_internal = FALSE
  );

-- Política: Usuarios pueden agregar comentarios a sus tickets
DROP POLICY IF EXISTS "Users can add comments to own tickets" ON support_ticket_comments;
CREATE POLICY "Users can add comments to own tickets" ON support_ticket_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND reporter_id::text = auth.uid()::text
    )
    AND user_id::text = auth.uid()::text
  );

-- Política: Admins tienen acceso completo a comentarios
DROP POLICY IF EXISTS "Admins full access to comments" ON support_ticket_comments;
CREATE POLICY "Admins full access to comments" ON support_ticket_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id::text = auth.uid()::text
      AND (role_name = 'admin' OR role_name = 'administrador_operativo')
    )
  );

-- Política: Usuarios pueden ver historial de sus tickets
DROP POLICY IF EXISTS "Users can view history of own tickets" ON support_ticket_history;
CREATE POLICY "Users can view history of own tickets" ON support_ticket_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND reporter_id::text = auth.uid()::text
    )
  );

-- Política: Admins tienen acceso completo a historial
DROP POLICY IF EXISTS "Admins full access to history" ON support_ticket_history;
CREATE POLICY "Admins full access to history" ON support_ticket_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id::text = auth.uid()::text
      AND (role_name = 'admin' OR role_name = 'administrador_operativo')
    )
  );

-- Política: Usuarios pueden ver adjuntos de sus tickets
DROP POLICY IF EXISTS "Users can view attachments of own tickets" ON support_ticket_attachments;
CREATE POLICY "Users can view attachments of own tickets" ON support_ticket_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND reporter_id::text = auth.uid()::text
    )
  );

-- Política: Admins tienen acceso completo a adjuntos
DROP POLICY IF EXISTS "Admins full access to attachments" ON support_ticket_attachments;
CREATE POLICY "Admins full access to attachments" ON support_ticket_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id::text = auth.uid()::text
      AND (role_name = 'admin' OR role_name = 'administrador_operativo')
    )
  );

-- Comentario de finalización
COMMENT ON TABLE support_tickets IS 'Sistema de tickets de soporte - Reportes de fallas y requerimientos';
COMMENT ON TABLE support_ticket_comments IS 'Comentarios y respuestas en tickets de soporte';
COMMENT ON TABLE support_ticket_history IS 'Historial de cambios de estado en tickets';
COMMENT ON TABLE support_ticket_attachments IS 'Archivos adjuntos en tickets de soporte';
