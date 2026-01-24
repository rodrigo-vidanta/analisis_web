-- ============================================
-- ASOCIAR LOGS CON TICKETS
-- ============================================
-- Fecha: 2026-01-24
-- Objetivo: Prevenir tickets duplicados desde el mismo log

-- 1. Agregar columna log_id a support_tickets
ALTER TABLE support_tickets
ADD COLUMN IF NOT EXISTS log_id UUID REFERENCES error_logs(id) ON DELETE SET NULL;

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_support_tickets_log_id ON support_tickets(log_id);

-- 3. Comentario para documentación
COMMENT ON COLUMN support_tickets.log_id IS 'ID del log del sistema desde el cual se creó este ticket (si aplica)';

-- 4. Función para verificar si un log ya tiene ticket asociado
CREATE OR REPLACE FUNCTION check_log_has_ticket(p_log_id UUID)
RETURNS TABLE (
  has_ticket BOOLEAN,
  ticket_id UUID,
  ticket_number VARCHAR(20),
  ticket_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM support_tickets WHERE log_id = p_log_id) as has_ticket,
    t.id as ticket_id,
    t.ticket_number,
    t.status as ticket_status
  FROM support_tickets t
  WHERE t.log_id = p_log_id
  LIMIT 1;
END;
$$;
