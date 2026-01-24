-- ============================================
-- TABLA DE AUDITORÍA PARA MCP
-- ============================================

CREATE TABLE IF NOT EXISTS mcp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id),
  operation TEXT NOT NULL,
  table_name TEXT,
  sql_query TEXT,
  error_message TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  metadata JSONB
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_mcp_audit_user_id ON mcp_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_timestamp ON mcp_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_operation ON mcp_audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_table ON mcp_audit_log(table_name);

-- RLS: Solo admins pueden ver el log completo
ALTER TABLE mcp_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propias operaciones"
  ON mcp_audit_log
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins pueden ver todo"
  ON mcp_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Solo el sistema puede insertar (via Edge Function)
CREATE POLICY "Sistema puede insertar"
  ON mcp_audit_log
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE mcp_audit_log IS 'Log de auditoría para operaciones de MCP (Cursor IDE)';
