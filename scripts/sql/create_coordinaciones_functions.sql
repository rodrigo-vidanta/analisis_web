-- ============================================
-- FUNCIONES RPC PARA SISTEMA DE COORDINACIONES
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
--
-- ⚠️ REGLAS DE ORO:
-- 1. Estas funciones manejan la lógica de asignación automática
-- 2. Todas las funciones deben validar permisos
-- 3. Las asignaciones se registran en assignment_logs para auditoría
-- ============================================

-- ============================================
-- 1. FUNCIÓN: Obtener conteo de asignaciones de coordinación
-- ============================================
CREATE OR REPLACE FUNCTION get_coordinacion_assignment_count(
  p_coordinacion_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM prospect_assignments
  WHERE coordinacion_id = p_coordinacion_id
    AND is_active = true
    AND assigned_at >= p_start_date;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_coordinacion_assignment_count IS 'Obtiene el número de prospectos asignados a una coordinación desde una fecha específica';

-- ============================================
-- 2. FUNCIÓN: Obtener conteo de asignaciones de ejecutivo
-- ============================================
CREATE OR REPLACE FUNCTION get_ejecutivo_assignment_count(
  p_ejecutivo_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM prospect_assignments
  WHERE ejecutivo_id = p_ejecutivo_id
    AND is_active = true
    AND assigned_at >= p_start_date;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_ejecutivo_assignment_count IS 'Obtiene el número de prospectos asignados a un ejecutivo desde una fecha específica';

-- ============================================
-- 3. FUNCIÓN: Obtener fecha de inicio del día (0:00)
-- ============================================
CREATE OR REPLACE FUNCTION get_today_start()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN date_trunc('day', NOW() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_today_start IS 'Obtiene la fecha de inicio del día actual (0:00) en zona horaria de México';

-- ============================================
-- 4. FUNCIÓN: Asignar prospecto a coordinación (Round-Robin)
-- ============================================
CREATE OR REPLACE FUNCTION assign_prospect_to_coordinacion(
  p_prospect_id UUID,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_coordinacion_id UUID;
  v_today_start TIMESTAMP WITH TIME ZONE;
  v_min_count INTEGER;
  v_coordinaciones RECORD;
  v_last_assigned UUID;
  v_assignment_id UUID;
BEGIN
  -- Obtener fecha de inicio del día (0:00)
  v_today_start := get_today_start();
  
  -- Verificar si el prospecto ya tiene una asignación activa
  SELECT coordinacion_id INTO v_coordinacion_id
  FROM prospect_assignments
  WHERE prospect_id = p_prospect_id
    AND is_active = true;
  
  IF v_coordinacion_id IS NOT NULL THEN
    RAISE NOTICE 'Prospecto % ya tiene asignación activa a coordinación %', p_prospect_id, v_coordinacion_id;
    RETURN v_coordinacion_id;
  END IF;
  
  -- Obtener el mínimo número de asignaciones
  SELECT MIN(get_coordinacion_assignment_count(c.id, v_today_start))
  INTO v_min_count
  FROM coordinaciones c
  WHERE c.is_active = true;
  
  -- Obtener coordinaciones con el mínimo número de asignaciones
  -- Si hay empate, usar round-robin basado en la última asignación
  SELECT c.id INTO v_coordinacion_id
  FROM coordinaciones c
  WHERE c.is_active = true
    AND get_coordinacion_assignment_count(c.id, v_today_start) = v_min_count
  ORDER BY (
    SELECT MAX(pa.assigned_at)
    FROM prospect_assignments pa
    WHERE pa.coordinacion_id = c.id
      AND pa.is_active = true
  ) NULLS FIRST
  LIMIT 1;
  
  -- Si no se encontró coordinación, tomar la primera activa
  IF v_coordinacion_id IS NULL THEN
    SELECT id INTO v_coordinacion_id
    FROM coordinaciones
    WHERE is_active = true
    ORDER BY codigo
    LIMIT 1;
  END IF;
  
  -- Crear asignación
  INSERT INTO prospect_assignments (
    prospect_id,
    coordinacion_id,
    assigned_by,
    assignment_type,
    assignment_reason
  ) VALUES (
    p_prospect_id,
    v_coordinacion_id,
    p_assigned_by,
    CASE WHEN p_assigned_by IS NULL THEN 'automatic' ELSE 'manual' END,
    CASE WHEN p_assigned_by IS NULL THEN 'Asignación automática por balanceo' ELSE 'Asignación manual' END
  )
  RETURNING id INTO v_assignment_id;
  
  -- Registrar en logs
  INSERT INTO assignment_logs (
    prospect_id,
    coordinacion_id,
    action,
    assigned_by,
    reason
  ) VALUES (
    p_prospect_id,
    v_coordinacion_id,
    'assigned',
    p_assigned_by,
    CASE WHEN p_assigned_by IS NULL THEN 'Asignación automática por balanceo' ELSE 'Asignación manual' END
  );
  
  -- Actualizar estadísticas
  INSERT INTO coordinacion_statistics (
    coordinacion_id,
    ejecutivo_id,
    stat_date,
    prospects_assigned_count,
    last_assignment_time
  ) VALUES (
    v_coordinacion_id,
    NULL,
    CURRENT_DATE,
    1,
    NOW()
  )
  ON CONFLICT (coordinacion_id, ejecutivo_id, stat_date)
  DO UPDATE SET
    prospects_assigned_count = coordinacion_statistics.prospects_assigned_count + 1,
    last_assignment_time = NOW(),
    updated_at = NOW();
  
  RAISE NOTICE 'Prospecto % asignado a coordinación %', p_prospect_id, v_coordinacion_id;
  
  RETURN v_coordinacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_prospect_to_coordinacion IS 'Asigna un prospecto a la coordinación con menos asignaciones en las últimas 24 horas (desde 0:00). Usa round-robin en caso de empate.';

-- ============================================
-- 5. FUNCIÓN: Asignar prospecto a ejecutivo (Round-Robin)
-- ============================================
CREATE OR REPLACE FUNCTION assign_prospect_to_ejecutivo(
  p_prospect_id UUID,
  p_coordinacion_id UUID,
  p_assigned_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_ejecutivo_id UUID;
  v_today_start TIMESTAMP WITH TIME ZONE;
  v_min_count INTEGER;
  v_ejecutivos RECORD;
  v_assignment_id UUID;
BEGIN
  -- Verificar que el prospecto esté asignado a la coordinación
  IF NOT EXISTS (
    SELECT 1 FROM prospect_assignments
    WHERE prospect_id = p_prospect_id
      AND coordinacion_id = p_coordinacion_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'El prospecto % no está asignado a la coordinación %', p_prospect_id, p_coordinacion_id;
  END IF;
  
  -- Obtener fecha de inicio del día (0:00)
  v_today_start := get_today_start();
  
  -- Obtener el mínimo número de asignaciones de ejecutivos de esta coordinación
  SELECT MIN(get_ejecutivo_assignment_count(e.id, v_today_start))
  INTO v_min_count
  FROM auth_users e
  JOIN auth_roles r ON e.role_id = r.id
  WHERE e.coordinacion_id = p_coordinacion_id
    AND r.name = 'ejecutivo'
    AND e.is_active = true;
  
  -- Obtener ejecutivo con el mínimo número de asignaciones
  -- Si hay empate, usar round-robin basado en la última asignación
  SELECT e.id INTO v_ejecutivo_id
  FROM auth_users e
  JOIN auth_roles r ON e.role_id = r.id
  WHERE e.coordinacion_id = p_coordinacion_id
    AND r.name = 'ejecutivo'
    AND e.is_active = true
    AND get_ejecutivo_assignment_count(e.id, v_today_start) = v_min_count
  ORDER BY (
    SELECT MAX(pa.assigned_at)
    FROM prospect_assignments pa
    WHERE pa.ejecutivo_id = e.id
      AND pa.is_active = true
  ) NULLS FIRST
  LIMIT 1;
  
  -- Si no se encontró ejecutivo, tomar el primero activo de la coordinación
  IF v_ejecutivo_id IS NULL THEN
    SELECT e.id INTO v_ejecutivo_id
    FROM auth_users e
    JOIN auth_roles r ON e.role_id = r.id
    WHERE e.coordinacion_id = p_coordinacion_id
      AND r.name = 'ejecutivo'
      AND e.is_active = true
    ORDER BY e.email
    LIMIT 1;
  END IF;
  
  IF v_ejecutivo_id IS NULL THEN
    RAISE EXCEPTION 'No hay ejecutivos activos en la coordinación %', p_coordinacion_id;
  END IF;
  
  -- Actualizar asignación existente
  UPDATE prospect_assignments
  SET ejecutivo_id = v_ejecutivo_id,
      assigned_by = COALESCE(p_assigned_by, assigned_by),
      assignment_type = CASE WHEN p_assigned_by IS NULL THEN 'automatic' ELSE 'manual' END,
      assignment_reason = CASE WHEN p_assigned_by IS NULL THEN 'Asignación automática por balanceo (ID CRM detectado)' ELSE 'Asignación manual' END,
      updated_at = NOW()
  WHERE prospect_id = p_prospect_id
    AND coordinacion_id = p_coordinacion_id
    AND is_active = true
  RETURNING id INTO v_assignment_id;
  
  -- Registrar en logs
  INSERT INTO assignment_logs (
    prospect_id,
    coordinacion_id,
    ejecutivo_id,
    action,
    assigned_by,
    reason
  ) VALUES (
    p_prospect_id,
    p_coordinacion_id,
    v_ejecutivo_id,
    'assigned',
    p_assigned_by,
    CASE WHEN p_assigned_by IS NULL THEN 'Asignación automática por balanceo (ID CRM detectado)' ELSE 'Asignación manual' END
  );
  
  -- Actualizar estadísticas
  INSERT INTO coordinacion_statistics (
    coordinacion_id,
    ejecutivo_id,
    stat_date,
    prospects_assigned_count,
    last_assignment_time
  ) VALUES (
    p_coordinacion_id,
    v_ejecutivo_id,
    CURRENT_DATE,
    1,
    NOW()
  )
  ON CONFLICT (coordinacion_id, ejecutivo_id, stat_date)
  DO UPDATE SET
    prospects_assigned_count = coordinacion_statistics.prospects_assigned_count + 1,
    last_assignment_time = NOW(),
    updated_at = NOW();
  
  RAISE NOTICE 'Prospecto % asignado a ejecutivo % de coordinación %', p_prospect_id, v_ejecutivo_id, p_coordinacion_id;
  
  RETURN v_ejecutivo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_prospect_to_ejecutivo IS 'Asigna un prospecto a un ejecutivo de la coordinación según carga de trabajo. Usa round-robin en caso de empate.';

-- ============================================
-- 6. FUNCIÓN: Verificar y asignar prospecto con ID CRM
-- ============================================
-- NOTA: Esta función debe ser llamada desde un trigger o servicio externo
-- que verifique cuando un prospecto obtiene id_dynamics
-- Por ahora, creamos la función que se puede llamar manualmente

CREATE OR REPLACE FUNCTION check_and_assign_prospect_with_crm(
  p_prospect_id UUID,
  p_id_dynamics VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
  v_coordinacion_id UUID;
  v_ejecutivo_id UUID;
BEGIN
  -- Verificar que el prospecto tenga ID CRM
  IF p_id_dynamics IS NULL OR p_id_dynamics = '' THEN
    RAISE NOTICE 'Prospecto % no tiene ID CRM, no se asigna a ejecutivo', p_prospect_id;
    RETURN NULL;
  END IF;
  
  -- Obtener coordinación asignada al prospecto
  SELECT coordinacion_id INTO v_coordinacion_id
  FROM prospect_assignments
  WHERE prospect_id = p_prospect_id
    AND is_active = true;
  
  IF v_coordinacion_id IS NULL THEN
    -- Si no tiene coordinación, asignar primero a coordinación
    v_coordinacion_id := assign_prospect_to_coordinacion(p_prospect_id);
  END IF;
  
  -- Verificar si ya tiene ejecutivo asignado
  SELECT ejecutivo_id INTO v_ejecutivo_id
  FROM prospect_assignments
  WHERE prospect_id = p_prospect_id
    AND is_active = true;
  
  IF v_ejecutivo_id IS NOT NULL THEN
    RAISE NOTICE 'Prospecto % ya tiene ejecutivo asignado: %', p_prospect_id, v_ejecutivo_id;
    RETURN v_ejecutivo_id;
  END IF;
  
  -- Asignar a ejecutivo
  v_ejecutivo_id := assign_prospect_to_ejecutivo(p_prospect_id, v_coordinacion_id);
  
  RETURN v_ejecutivo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_and_assign_prospect_with_crm IS 'Verifica si un prospecto tiene ID CRM y lo asigna automáticamente a un ejecutivo de su coordinación.';

-- ============================================
-- 7. FUNCIÓN: Obtener permisos de usuario
-- ============================================
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_user_role VARCHAR(50);
  v_coordinacion_id UUID;
  v_permissions JSON;
BEGIN
  -- Obtener rol y coordinación del usuario
  SELECT r.name, u.coordinacion_id
  INTO v_user_role, v_coordinacion_id
  FROM auth_users u
  JOIN auth_roles r ON u.role_id = r.id
  WHERE u.id = p_user_id;
  
  IF v_user_role IS NULL THEN
    RETURN json_build_object('error', 'Usuario no encontrado');
  END IF;
  
  -- Obtener permisos del rol
  SELECT json_agg(
    json_build_object(
      'module', p.module,
      'permission_type', p.permission_type,
      'is_granted', p.is_granted
    )
  ) INTO v_permissions
  FROM permissions p
  JOIN auth_roles r ON p.role_id = r.id
  WHERE r.name = v_user_role;
  
  RETURN json_build_object(
    'user_id', p_user_id,
    'role', v_user_role,
    'coordinacion_id', v_coordinacion_id,
    'permissions', COALESCE(v_permissions, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_permissions IS 'Obtiene todos los permisos de un usuario según su rol y coordinación.';

-- ============================================
-- 8. FUNCIÓN: Verificar acceso a prospecto
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

COMMENT ON FUNCTION can_user_access_prospect IS 'Verifica si un usuario puede acceder a un prospecto específico según su rol y coordinación.';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- NOTAS IMPORTANTES:
-- 1. Todas las funciones usan SECURITY DEFINER para bypass de RLS
-- 2. Las funciones deben ser llamadas desde servicios con permisos adecuados
-- 3. La función get_today_start() usa zona horaria de México (ajustar si es necesario)
-- 4. Las funciones de asignación registran todo en assignment_logs para auditoría

