-- ============================================
-- FIX: Eliminar funciones duplicadas y crear versión correcta
-- ============================================
-- Resuelve error PGRST203 (múltiples candidatos)
-- Agrega soporte para p_log_id

-- 1. Eliminar TODAS las versiones existentes
DROP FUNCTION IF EXISTS create_system_ticket(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT
);

DROP FUNCTION IF EXISTS create_system_ticket(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID, TEXT, UUID
);

-- 2. Crear función ÚNICA con p_log_id
CREATE OR REPLACE FUNCTION create_system_ticket(
  p_type TEXT,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_subcategory TEXT,
  p_priority TEXT,
  p_form_data JSONB,
  p_assigned_to UUID DEFAULT NULL,
  p_assigned_to_role TEXT DEFAULT NULL,
  p_log_id UUID DEFAULT NULL -- ✅ NUEVO
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_ticket_id UUID;
  v_ticket_number VARCHAR(20);
  v_status TEXT;
  v_result JSONB;
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
    form_data,
    log_id -- ✅ NUEVO
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
    p_form_data,
    p_log_id -- ✅ NUEVO
  )
  RETURNING id INTO v_ticket_id;
  
  -- Construir JSON de respuesta
  SELECT jsonb_build_object(
    'id', t.id,
    'ticket_number', t.ticket_number,
    'type', t.type,
    'title', t.title,
    'description', t.description,
    'category', t.category,
    'subcategory', t.subcategory,
    'priority', t.priority,
    'status', t.status,
    'reporter_id', t.reporter_id,
    'reporter_name', t.reporter_name,
    'reporter_email', t.reporter_email,
    'reporter_role', t.reporter_role,
    'assigned_to', t.assigned_to,
    'assigned_to_role', t.assigned_to_role,
    'assigned_at', t.assigned_at,
    'assigned_by', t.assigned_by,
    'form_data', t.form_data,
    'log_id', t.log_id, -- ✅ NUEVO
    'created_at', t.created_at,
    'updated_at', t.updated_at
  ) INTO v_result
  FROM support_tickets t
  WHERE t.id = v_ticket_id;
  
  RETURN v_result;
END;
$$;

-- 3. Verificación
COMMENT ON FUNCTION create_system_ticket IS 'Crea ticket automático con reporter_id=system (incluye log_id)';
