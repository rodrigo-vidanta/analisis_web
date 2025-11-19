-- ============================================
-- CORRECCIÓN: Ejecutivos NO deben ver prospectos sin asignar
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================

CREATE OR REPLACE FUNCTION can_user_access_prospect(
  p_user_id UUID,
  p_prospect_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR(50);
  v_user_coordinacion_id UUID;
  v_prospect_coordinacion_id UUID;
  v_prospect_ejecutivo_id UUID;
BEGIN
  -- Obtener rol y coordinación del usuario
  SELECT r.name, u.coordinacion_id
  INTO v_user_role, v_user_coordinacion_id
  FROM auth_users u
  JOIN auth_roles r ON u.role_id = r.id
  WHERE u.id = p_user_id;
  
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin puede ver todo
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Obtener asignación del prospecto
  SELECT coordinacion_id, ejecutivo_id
  INTO v_prospect_coordinacion_id, v_prospect_ejecutivo_id
  FROM prospect_assignments
  WHERE prospect_id = p_prospect_id
    AND is_active = true;
  
  -- Si el prospecto no tiene asignación, solo admin puede verlo
  IF v_prospect_coordinacion_id IS NULL THEN
    RETURN v_user_role = 'admin';
  END IF;
  
  -- Coordinador puede ver todos los prospectos de su coordinación
  IF v_user_role = 'coordinador' THEN
    RETURN v_user_coordinacion_id = v_prospect_coordinacion_id;
  END IF;
  
  -- Ejecutivo solo puede ver sus prospectos asignados (NO puede ver sin asignar)
  IF v_user_role = 'ejecutivo' THEN
    RETURN v_user_coordinacion_id = v_prospect_coordinacion_id
      AND v_prospect_ejecutivo_id = p_user_id;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_access_prospect IS 'Verifica si un usuario puede acceder a un prospecto específico según su rol y coordinación. Ejecutivos SOLO ven prospectos asignados a ellos.';

