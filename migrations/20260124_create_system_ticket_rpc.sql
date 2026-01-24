-- ============================================
-- FUNCIÓN RPC PARA CREAR TICKETS SYSTEM
-- ============================================
-- Bypassa RLS usando SECURITY DEFINER
-- Permite crear tickets con reporter_id = system

CREATE OR REPLACE FUNCTION create_system_ticket(
  p_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_subcategory TEXT,
  p_priority TEXT,
  p_form_data JSONB,
  p_assigned_to UUID,
  p_assigned_to_role TEXT
)
RETURNS TABLE (
  id UUID,
  ticket_number TEXT,
  type TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  priority TEXT,
  status TEXT,
  reporter_id UUID,
  reporter_name TEXT,
  reporter_email TEXT,
  reporter_role TEXT,
  assigned_to UUID,
  assigned_to_role TEXT,
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  form_data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_system_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_ticket_id UUID;
  v_ticket_number TEXT;
  v_status TEXT;
BEGIN
  -- Generar número de ticket
  v_ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  -- Determinar status
  IF p_assigned_to IS NOT NULL OR p_assigned_to_role IS NOT NULL THEN
    v_status := 'en_progreso';
  ELSE
    v_status := 'abierto';
  END IF;
  
  -- Insertar ticket
  INSERT INTO support_tickets (
    ticket_number,
    type,
    title,
    description,
    category,
    subcategory,
    priority,
    status,
    reporter_id,
    reporter_name,
    reporter_email,
    reporter_role,
    assigned_to,
    assigned_to_role,
    assigned_at,
    assigned_by,
    form_data
  ) VALUES (
    v_ticket_number,
    p_type,
    p_title,
    p_description,
    p_category,
    p_subcategory,
    p_priority,
    v_status,
    v_system_user_id,
    'Sistema Automático',
    'system@internal',
    'system',
    p_assigned_to,
    p_assigned_to_role,
    CASE WHEN p_assigned_to IS NOT NULL OR p_assigned_to_role IS NOT NULL THEN NOW() ELSE NULL END,
    v_system_user_id,
    p_form_data
  )
  RETURNING support_tickets.id INTO v_ticket_id;
  
  -- Retornar el ticket creado
  RETURN QUERY
  SELECT 
    t.id,
    t.ticket_number,
    t.type,
    t.title,
    t.description,
    t.category,
    t.subcategory,
    t.priority,
    t.status,
    t.reporter_id,
    t.reporter_name,
    t.reporter_email,
    t.reporter_role,
    t.assigned_to,
    t.assigned_to_role,
    t.assigned_at,
    t.assigned_by,
    t.form_data,
    t.created_at,
    t.updated_at
  FROM support_tickets t
  WHERE t.id = v_ticket_id;
END;
$$;
