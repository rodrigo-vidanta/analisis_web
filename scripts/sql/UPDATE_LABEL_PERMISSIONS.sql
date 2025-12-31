-- ============================================
-- ACTUALIZAR FUNCIÓN DE PERMISOS DE REMOCIÓN
-- Base: SYSTEM_UI (zbylezfyagwrxoecioup)
-- ============================================
--
-- REGLAS:
-- 1. Admin/Admin Operativo → Pueden quitar cualquiera
-- 2. Coordinador de Calidad → Pueden quitar cualquiera
-- 3. Usuario que aplicó la etiqueta → Puede quitarla
-- 4. Coordinador de la misma coordinación → Puede quitarla
-- ============================================

CREATE OR REPLACE FUNCTION can_remove_label_from_prospecto(
  p_relation_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  assigned_by_id UUID;
  assigned_by_role VARCHAR(50);
  assigned_by_coordinacion UUID;
  current_user_role VARCHAR(50);
  current_user_coordinaciones UUID[];
  is_coordinador_calidad BOOLEAN := false;
BEGIN
  -- Obtener info de quien aplicó la etiqueta (usar alias wcl para evitar ambigüedad)
  SELECT 
    wcl.added_by,
    wcl.assigned_by_role,
    wcl.assigned_by_coordinacion_id
  INTO 
    assigned_by_id,
    assigned_by_role,
    assigned_by_coordinacion
  FROM whatsapp_conversation_labels wcl
  WHERE wcl.id = p_relation_id;
  
  IF assigned_by_id IS NULL THEN
    RETURN json_build_object('canRemove', false, 'reason', 'Etiqueta no encontrada');
  END IF;
  
  -- Obtener info del usuario actual
  SELECT r.name
  INTO current_user_role
  FROM auth_users u
  JOIN auth_roles r ON u.role_id = r.id
  WHERE u.id = p_user_id;
  
  -- Obtener coordinaciones del usuario desde auth_user_coordinaciones
  SELECT array_agg(coordinacion_id)
  INTO current_user_coordinaciones
  FROM auth_user_coordinaciones
  WHERE user_id = p_user_id;
  
  -- REGLA 1: Admin y Admin Operativo pueden quitar CUALQUIERA
  IF current_user_role IN ('admin', 'administrador_operativo') THEN
    RETURN json_build_object('canRemove', true, 'reason', 'Eres administrador');
  END IF;
  
  -- REGLA 2: Coordinador de Calidad puede quitar CUALQUIERA
  SELECT EXISTS (
    SELECT 1 FROM auth_user_coordinaciones auc
    JOIN coordinaciones c ON auc.coordinacion_id = c.id
    WHERE auc.user_id = p_user_id AND c.codigo = 'CALIDAD'
  ) INTO is_coordinador_calidad;
  
  IF is_coordinador_calidad THEN
    RETURN json_build_object('canRemove', true, 'reason', 'Eres coordinador de Calidad');
  END IF;
  
  -- REGLA 3: Si el usuario actual es quien la aplicó
  IF assigned_by_id = p_user_id THEN
    RETURN json_build_object('canRemove', true, 'reason', 'Tú aplicaste esta etiqueta');
  END IF;
  
  -- REGLA 4: Coordinador de la misma coordinación que quien la aplicó
  IF current_user_role IN ('coordinador', 'supervisor') AND assigned_by_coordinacion IS NOT NULL THEN
    IF current_user_coordinaciones @> ARRAY[assigned_by_coordinacion] THEN
      RETURN json_build_object('canRemove', true, 'reason', 'Eres coordinador de la misma coordinación');
    END IF;
  END IF;
  
  RETURN json_build_object('canRemove', false, 'reason', 'No tienes permisos para remover esta etiqueta');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_remove_label_from_prospecto IS 
'Valida permisos de remoción de etiquetas:
- Admin/AdminOp: Cualquiera
- Coordinador Calidad: Cualquiera
- Mismo usuario que aplicó: Sí
- Coordinador de misma coordinación: Sí';

