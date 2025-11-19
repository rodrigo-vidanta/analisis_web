-- ============================================
-- FUNCIÓN RPC: Insertar Prospecto con Asignación desde Backend
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- Esta función permite insertar una asignación desde backend (N8N)
-- sin que el sistema automático la sobrescriba
-- ============================================

CREATE OR REPLACE FUNCTION insert_prospect_assignment_from_backend(
  p_prospect_id UUID,
  p_coordinacion_id UUID,
  p_ejecutivo_id UUID DEFAULT NULL,
  p_assignment_reason TEXT DEFAULT 'Asignación desde backend'
)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
  v_existing_assignment UUID;
BEGIN
  -- Verificar si ya tiene asignación activa
  SELECT id INTO v_existing_assignment
  FROM prospect_assignments
  WHERE prospect_id = p_prospect_id
    AND is_active = true;
  
  IF v_existing_assignment IS NOT NULL THEN
    -- Ya tiene asignación, actualizar si es necesario
    UPDATE prospect_assignments
    SET 
      coordinacion_id = p_coordinacion_id,
      ejecutivo_id = COALESCE(p_ejecutivo_id, ejecutivo_id),
      assignment_type = 'backend',
      assignment_reason = p_assignment_reason,
      updated_at = NOW()
    WHERE id = v_existing_assignment;
    
    RETURN v_existing_assignment;
  END IF;
  
  -- Crear nueva asignación
  INSERT INTO prospect_assignments (
    prospect_id,
    coordinacion_id,
    ejecutivo_id,
    assigned_by,
    assignment_type,
    assignment_reason,
    is_active,
    assigned_at
  ) VALUES (
    p_prospect_id,
    p_coordinacion_id,
    p_ejecutivo_id,
    NULL,  -- NULL porque es desde backend
    'backend',  -- Tipo: backend para distinguir de automatic y manual
    p_assignment_reason,
    true,
    NOW()
  )
  RETURNING id INTO v_assignment_id;
  
  -- Registrar en logs
  INSERT INTO assignment_logs (
    prospect_id,
    coordinacion_id,
    ejecutivo_id,
    action,
    assigned_by,
    reason,
    metadata
  ) VALUES (
    p_prospect_id,
    p_coordinacion_id,
    p_ejecutivo_id,
    'assigned',
    NULL,
    p_assignment_reason,
    jsonb_build_object(
      'source', 'backend',
      'assignment_type', 'backend'
    )
  );
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION insert_prospect_assignment_from_backend IS 'Inserta o actualiza asignación de prospecto desde backend (N8N). El sistema automático verificará esta asignación y no la sobrescribirá.';

-- Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION insert_prospect_assignment_from_backend TO anon, authenticated, service_role;

