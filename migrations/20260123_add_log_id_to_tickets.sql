-- ============================================
-- MIGRACIÓN: Asociar Tickets con Logs del Sistema
-- ============================================
-- Fecha: 2026-01-23
-- Objetivo: Permitir crear tickets desde logs y prevenir duplicados
--
-- ============================================
-- PASO 1: Agregar columna log_id a support_tickets
-- ============================================

ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS log_id UUID;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_support_tickets_log_id ON support_tickets(log_id);

-- Comentario de la columna
COMMENT ON COLUMN support_tickets.log_id IS 'ID del log del sistema desde el que se creó el ticket (si aplica)';

-- ============================================
-- PASO 2: Actualizar función create_system_ticket
-- ============================================
-- Agregar parámetro log_id a la función RPC

CREATE OR REPLACE FUNCTION create_system_ticket(
  p_type VARCHAR(50),
  p_title VARCHAR(255),
  p_description TEXT,
  p_category VARCHAR(100) DEFAULT NULL,
  p_subcategory VARCHAR(100) DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'normal',
  p_form_data JSONB DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_to_role VARCHAR(50) DEFAULT NULL,
  p_log_id UUID DEFAULT NULL -- ✅ NUEVO parámetro
)
RETURNS TABLE(
  id UUID,
  ticket_number VARCHAR(50),
  type VARCHAR(50),
  status VARCHAR(20),
  priority VARCHAR(20),
  title VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  form_data JSONB,
  log_id UUID, -- ✅ NUEVO campo en respuesta
  reporter_id UUID,
  reporter_name VARCHAR(255),
  reporter_email VARCHAR(255),
  reporter_role VARCHAR(50),
  assigned_to UUID,
  assigned_to_role VARCHAR(50),
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  system_user_id UUID := '00000000-0000-0000-0000-000000000001';
  new_ticket_number VARCHAR(50);
  new_ticket_id UUID;
BEGIN
  -- Generar número de ticket único
  new_ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Insertar ticket sin disparar notificaciones (status = en_progreso)
  INSERT INTO support_tickets (
    ticket_number,
    type,
    status,
    priority,
    title,
    description,
    category,
    subcategory,
    form_data,
    log_id, -- ✅ NUEVO campo
    reporter_id,
    reporter_name,
    reporter_email,
    reporter_role,
    assigned_to,
    assigned_to_role,
    assigned_at,
    assigned_by
  ) VALUES (
    new_ticket_number,
    p_type,
    'en_progreso', -- Pre-asignado, sin notificaciones
    p_priority,
    p_title,
    p_description,
    p_category,
    p_subcategory,
    p_form_data,
    p_log_id, -- ✅ NUEVO valor
    system_user_id,
    'Sistema Automático',
    'system@internal',
    'system',
    p_assigned_to,
    p_assigned_to_role,
    CASE WHEN p_assigned_to IS NOT NULL OR p_assigned_to_role IS NOT NULL THEN NOW() ELSE NULL END,
    system_user_id
  )
  RETURNING support_tickets.id INTO new_ticket_id;
  
  -- Retornar el ticket creado
  RETURN QUERY
  SELECT 
    t.id,
    t.ticket_number,
    t.type,
    t.status,
    t.priority,
    t.title,
    t.description,
    t.category,
    t.subcategory,
    t.form_data,
    t.log_id, -- ✅ NUEVO campo
    t.reporter_id,
    t.reporter_name,
    t.reporter_email,
    t.reporter_role,
    t.assigned_to,
    t.assigned_to_role,
    t.assigned_at,
    t.assigned_by,
    t.created_at,
    t.updated_at,
    t.resolved_at,
    t.closed_at
  FROM support_tickets t
  WHERE t.id = new_ticket_id;
END;
$$;

-- ============================================
-- PASO 3: Función para verificar si log tiene ticket
-- ============================================

CREATE OR REPLACE FUNCTION check_log_has_ticket(p_log_id UUID)
RETURNS TABLE(
  has_ticket BOOLEAN,
  ticket_id UUID,
  ticket_number VARCHAR(50),
  ticket_status VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  
  -- Si no hay ticket, retornar row con false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(50), NULL::VARCHAR(20);
  END IF;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION check_log_has_ticket(UUID) IS 'Verifica si un log ya tiene un ticket asociado y retorna información básica del ticket';

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================

-- Verificación:
-- SELECT log_id FROM support_tickets WHERE log_id IS NOT NULL LIMIT 5;
-- SELECT * FROM check_log_has_ticket('log-id-aqui');
