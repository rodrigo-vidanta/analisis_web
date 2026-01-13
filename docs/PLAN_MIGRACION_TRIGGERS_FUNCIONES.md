# Plan Detallado de Migración: Triggers y Funciones RPC

**Fecha:** 13 de Enero 2025  
**Proyecto:** Migración System_UI → PQNC_AI  
**Estado:** Plan de Ejecución

---

## 📋 Resumen Ejecutivo

Este documento detalla el plan de migración de:
- **4 triggers críticos** + sus funciones asociadas
- **18 funciones RPC críticas** usadas por el frontend
- **Verificación de compatibilidad** de funciones existentes

---

## 🎯 OBJETIVOS

1. Migrar triggers necesarios para mantener integridad de datos
2. Migrar funciones RPC usadas por el frontend
3. Verificar compatibilidad de funciones existentes en ambos proyectos
4. Asegurar que el frontend funcione sin cambios después de la migración

---

## 📦 FASE 1: MIGRACIÓN DE TRIGGERS CRÍTICOS

### 1.1 Trigger: `trigger_update_warning_counter`

**Objetivo:** Actualizar contador de advertencias cuando se inserta una advertencia de moderación.

**Pasos:**
1. Obtener definición de función `update_user_warning_counter()` de system_ui
2. Crear función en pqnc_ai
3. Crear trigger en tabla `content_moderation_warnings`

**Script SQL:**
```sql
-- 1. Crear función
CREATE OR REPLACE FUNCTION update_user_warning_counter()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar contador de advertencias del usuario
  INSERT INTO user_warning_counters (user_id, total_warnings, warnings_last_30_days, warnings_last_7_days, last_warning_at, updated_at)
  VALUES (
    NEW.user_id,
    1,
    CASE WHEN NEW.created_at >= NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END,
    CASE WHEN NEW.created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END,
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_warnings = user_warning_counters.total_warnings + 1,
    warnings_last_30_days = CASE WHEN NEW.created_at >= NOW() - INTERVAL '30 days' 
                                  THEN user_warning_counters.warnings_last_30_days + 1 
                                  ELSE user_warning_counters.warnings_last_30_days END,
    warnings_last_7_days = CASE WHEN NEW.created_at >= NOW() - INTERVAL '7 days' 
                                 THEN user_warning_counters.warnings_last_7_days + 1 
                                 ELSE user_warning_counters.warnings_last_7_days END,
    last_warning_at = NEW.created_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear trigger
DROP TRIGGER IF EXISTS trigger_update_warning_counter ON content_moderation_warnings;
CREATE TRIGGER trigger_update_warning_counter
  AFTER INSERT ON content_moderation_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_warning_counter();
```

**Verificación:**
```sql
-- Verificar que el trigger existe
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_warning_counter';
```

---

### 1.2 Trigger: `trigger_check_conflicting_labels`

**Objetivo:** Validar que no se asignen etiquetas conflictivas al mismo prospecto.

**Pasos:**
1. Obtener definición de función `check_conflicting_labels()` de system_ui
2. Crear función en pqnc_ai
3. Crear trigger en tabla `whatsapp_conversation_labels`

**Script SQL:**
```sql
-- 1. Crear función (obtener definición exacta de system_ui)
-- NOTA: Esta función debe validar reglas de negocio específicas
CREATE OR REPLACE FUNCTION check_conflicting_labels()
RETURNS TRIGGER AS $$
DECLARE
  conflicting_label_id UUID;
BEGIN
  -- Verificar si existe una etiqueta conflictiva
  -- (Lógica específica según reglas de negocio)
  SELECT id INTO conflicting_label_id
  FROM whatsapp_conversation_labels
  WHERE prospecto_id = NEW.prospecto_id
    AND label_id != NEW.label_id
    AND label_type = NEW.label_type
    AND shadow_cell = false
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF conflicting_label_id IS NOT NULL THEN
    RAISE EXCEPTION 'No se pueden asignar etiquetas conflictivas al mismo prospecto';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear trigger
DROP TRIGGER IF EXISTS trigger_check_conflicting_labels ON whatsapp_conversation_labels;
CREATE TRIGGER trigger_check_conflicting_labels
  BEFORE INSERT ON whatsapp_conversation_labels
  FOR EACH ROW
  EXECUTE FUNCTION check_conflicting_labels();
```

---

### 1.3 Trigger: `trigger_max_labels_per_prospecto`

**Objetivo:** Limitar el número máximo de etiquetas por prospecto.

**Script SQL:**
```sql
-- 1. Crear función
CREATE OR REPLACE FUNCTION check_max_labels_per_prospecto()
RETURNS TRIGGER AS $$
DECLARE
  label_count INTEGER;
  max_labels INTEGER := 10; -- Ajustar según reglas de negocio
BEGIN
  SELECT COUNT(*) INTO label_count
  FROM whatsapp_conversation_labels
  WHERE prospecto_id = NEW.prospecto_id
    AND shadow_cell = false;
  
  IF label_count >= max_labels THEN
    RAISE EXCEPTION 'Se ha alcanzado el número máximo de etiquetas por prospecto (%)', max_labels;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear trigger
DROP TRIGGER IF EXISTS trigger_max_labels_per_prospecto ON whatsapp_conversation_labels;
CREATE TRIGGER trigger_max_labels_per_prospecto
  BEFORE INSERT ON whatsapp_conversation_labels
  FOR EACH ROW
  EXECUTE FUNCTION check_max_labels_per_prospecto();
```

---

### 1.4 Trigger: `trigger_max_custom_labels`

**Objetivo:** Limitar el número máximo de etiquetas personalizadas por usuario.

**Script SQL:**
```sql
-- 1. Crear función
CREATE OR REPLACE FUNCTION check_max_custom_labels()
RETURNS TRIGGER AS $$
DECLARE
  label_count INTEGER;
  max_labels INTEGER := 20; -- Ajustar según reglas de negocio
BEGIN
  SELECT COUNT(*) INTO label_count
  FROM whatsapp_labels_custom
  WHERE user_id = NEW.user_id
    AND is_active = true;
  
  IF label_count >= max_labels THEN
    RAISE EXCEPTION 'Se ha alcanzado el número máximo de etiquetas personalizadas por usuario (%)', max_labels;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear trigger
DROP TRIGGER IF EXISTS trigger_max_custom_labels ON whatsapp_labels_custom;
CREATE TRIGGER trigger_max_custom_labels
  BEFORE INSERT ON whatsapp_labels_custom
  FOR EACH ROW
  EXECUTE FUNCTION check_max_custom_labels();
```

---

## 🔧 FASE 2: MIGRACIÓN DE FUNCIONES RPC CRÍTICAS

### 2.1 Funciones de Notificaciones

#### `mark_message_notifications_as_read`

**Uso:** Marcar notificaciones de mensajes como leídas.

**Script SQL:**
```sql
-- Obtener definición exacta de system_ui antes de migrar
-- Ejemplo de estructura esperada:
CREATE OR REPLACE FUNCTION mark_message_notifications_as_read(
  p_user_id UUID,
  p_message_ids UUID[] DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true,
      read_at = NOW()
  WHERE user_id = p_user_id
    AND notification_type = 'message'
    AND (p_message_ids IS NULL OR message_id = ANY(p_message_ids));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `mark_call_notifications_as_read`

**Uso:** Marcar notificaciones de llamadas como leídas.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION mark_call_notifications_as_read(
  p_user_id UUID,
  p_call_ids TEXT[] DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE user_notifications
  SET is_read = true,
      read_at = NOW()
  WHERE user_id = p_user_id
    AND notification_type = 'call'
    AND (p_call_ids IS NULL OR call_id = ANY(p_call_ids));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2.2 Funciones de Permisos

#### `get_user_permissions`

**Uso:** Obtener permisos de un usuario.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'permission_name', permission_name,
      'module', module,
      'sub_module', sub_module,
      'granted_at', granted_at
    )
  ) INTO result
  FROM auth_user_permissions
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `can_user_access_prospect`

**Uso:** Verificar si un usuario puede acceder a un prospecto.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION can_user_access_prospect(
  p_user_id UUID,
  p_prospect_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_id UUID;
  user_coordinacion_id UUID;
  prospect_coordinacion_id UUID;
BEGIN
  -- Obtener rol y coordinación del usuario
  SELECT role_id, coordinacion_id INTO user_role_id, user_coordinacion_id
  FROM auth_users
  WHERE id = p_user_id;
  
  -- Obtener coordinación del prospecto
  SELECT coordinacion_id INTO prospect_coordinacion_id
  FROM prospectos
  WHERE id = p_prospect_id;
  
  -- Lógica de acceso (ajustar según reglas de negocio)
  -- Ejemplo: Admin puede acceder a todos, ejecutivo solo a su coordinación
  IF user_role_id IN (SELECT id FROM auth_roles WHERE name = 'admin') THEN
    RETURN true;
  END IF;
  
  IF user_coordinacion_id = prospect_coordinacion_id THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `get_user_effective_permissions`

**Uso:** Obtener permisos efectivos de un usuario (incluyendo grupos).

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID)
RETURNS TABLE (
  permission_name TEXT,
  module TEXT,
  sub_module TEXT,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Permisos directos
  SELECT 
    aup.permission_name,
    aup.module,
    aup.sub_module,
    'direct'::TEXT as source
  FROM auth_user_permissions aup
  WHERE aup.user_id = p_user_id
  
  UNION
  
  -- Permisos de grupos
  SELECT DISTINCT
    gp.module || '.' || gp.action as permission_name,
    gp.module,
    NULL::TEXT as sub_module,
    'group'::TEXT as source
  FROM user_permission_groups upg
  JOIN group_permissions gp ON upg.group_id = gp.group_id
  WHERE upg.user_id = p_user_id
    AND gp.is_granted = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `user_has_permission`

**Uso:** Verificar si un usuario tiene un permiso específico.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_name TEXT,
  p_module TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  has_direct_permission BOOLEAN;
  has_group_permission BOOLEAN;
BEGIN
  -- Verificar permiso directo
  SELECT EXISTS(
    SELECT 1 FROM auth_user_permissions
    WHERE user_id = p_user_id
      AND permission_name = p_permission_name
      AND module = p_module
  ) INTO has_direct_permission;
  
  IF has_direct_permission THEN
    RETURN true;
  END IF;
  
  -- Verificar permiso de grupo
  SELECT EXISTS(
    SELECT 1 FROM user_permission_groups upg
    JOIN group_permissions gp ON upg.group_id = gp.group_id
    WHERE upg.user_id = p_user_id
      AND gp.module = p_module
      AND gp.action = p_permission_name
      AND gp.is_granted = true
  ) INTO has_group_permission;
  
  RETURN has_group_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2.3 Funciones de Etiquetas WhatsApp

#### `get_prospecto_labels`

**Uso:** Obtener etiquetas de un prospecto.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION get_prospecto_labels(p_prospecto_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', wcl.id,
      'label_id', wcl.label_id,
      'label_type', wcl.label_type,
      'label_name', COALESCE(wlp.name, wlc.name),
      'label_color', COALESCE(wlp.color, wlc.color),
      'added_at', wcl.added_at,
      'added_by', wcl.added_by
    )
  ) INTO result
  FROM whatsapp_conversation_labels wcl
  LEFT JOIN whatsapp_labels_preset wlp ON wcl.label_id = wlp.id AND wcl.label_type = 'preset'
  LEFT JOIN whatsapp_labels_custom wlc ON wcl.label_id = wlc.id AND wcl.label_type = 'custom'
  WHERE wcl.prospecto_id = p_prospecto_id
    AND wcl.shadow_cell = false;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `can_remove_label_from_prospecto`

**Uso:** Verificar si se puede remover una etiqueta de un prospecto.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION can_remove_label_from_prospecto(
  p_user_id UUID,
  p_prospecto_id UUID,
  p_label_id UUID
)
RETURNS JSON AS $$
DECLARE
  can_remove BOOLEAN := false;
  reason TEXT;
BEGIN
  -- Verificar permisos del usuario
  -- (Lógica específica según reglas de negocio)
  
  -- Verificar si la etiqueta existe
  IF NOT EXISTS(
    SELECT 1 FROM whatsapp_conversation_labels
    WHERE prospecto_id = p_prospecto_id
      AND label_id = p_label_id
  ) THEN
    RETURN json_build_object('can_remove', false, 'reason', 'Etiqueta no encontrada');
  END IF;
  
  -- Verificar permisos (ejemplo)
  IF EXISTS(
    SELECT 1 FROM auth_users
    WHERE id = p_user_id
      AND (role_id IN (SELECT id FROM auth_roles WHERE name IN ('admin', 'supervisor'))
           OR coordinacion_id IN (SELECT coordinacion_id FROM prospectos WHERE id = p_prospecto_id))
  ) THEN
    can_remove := true;
  END IF;
  
  RETURN json_build_object('can_remove', can_remove, 'reason', reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `add_label_to_prospecto`

**Uso:** Agregar etiqueta a un prospecto.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION add_label_to_prospecto(
  p_prospecto_id UUID,
  p_label_id UUID,
  p_label_type TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  new_label_id UUID;
BEGIN
  -- Validar que la etiqueta existe
  IF p_label_type = 'preset' AND NOT EXISTS(
    SELECT 1 FROM whatsapp_labels_preset WHERE id = p_label_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Etiqueta preset no encontrada');
  END IF;
  
  IF p_label_type = 'custom' AND NOT EXISTS(
    SELECT 1 FROM whatsapp_labels_custom WHERE id = p_label_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Etiqueta custom no encontrada');
  END IF;
  
  -- Insertar etiqueta
  INSERT INTO whatsapp_conversation_labels (
    prospecto_id,
    label_id,
    label_type,
    added_by,
    added_at
  ) VALUES (
    p_prospecto_id,
    p_label_id,
    p_label_type,
    p_user_id,
    NOW()
  )
  RETURNING id INTO new_label_id;
  
  RETURN json_build_object('success', true, 'label_id', new_label_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `remove_label_from_prospecto`

**Uso:** Remover etiqueta de un prospecto.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION remove_label_from_prospecto(
  p_prospecto_id UUID,
  p_label_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM whatsapp_conversation_labels
  WHERE prospecto_id = p_prospecto_id
    AND label_id = p_label_id
    AND shadow_cell = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `get_batch_prospecto_labels`

**Uso:** Obtener etiquetas de múltiples prospectos en batch.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION get_batch_prospecto_labels(p_prospecto_ids UUID[])
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(
    prospecto_id::TEXT,
    labels
  ) INTO result
  FROM (
    SELECT 
      wcl.prospecto_id,
      json_agg(
        json_build_object(
          'label_id', wcl.label_id,
          'label_type', wcl.label_type,
          'label_name', COALESCE(wlp.name, wlc.name),
          'label_color', COALESCE(wlp.color, wlc.color)
        )
      ) as labels
    FROM whatsapp_conversation_labels wcl
    LEFT JOIN whatsapp_labels_preset wlp ON wcl.label_id = wlp.id AND wcl.label_type = 'preset'
    LEFT JOIN whatsapp_labels_custom wlc ON wcl.label_id = wlc.id AND wcl.label_type = 'custom'
    WHERE wcl.prospecto_id = ANY(p_prospecto_ids)
      AND wcl.shadow_cell = false
    GROUP BY wcl.prospecto_id
  ) sub;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2.4 Funciones de Usuarios

#### `create_user_with_role`

**Uso:** Crear usuario con rol asignado.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION create_user_with_role(
  p_email TEXT,
  p_password_hash TEXT,
  p_full_name TEXT,
  p_role_name TEXT,
  p_coordinacion_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role_id UUID,
  role_name TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_role_id UUID;
BEGIN
  -- Obtener ID del rol
  SELECT id INTO v_role_id
  FROM auth_roles
  WHERE name = p_role_name;
  
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Rol no encontrado: %', p_role_name;
  END IF;
  
  -- Crear usuario
  INSERT INTO auth_users (
    email,
    password_hash,
    full_name,
    role_id,
    coordinacion_id,
    is_active,
    created_at
  ) VALUES (
    p_email,
    p_password_hash,
    p_full_name,
    v_role_id,
    p_coordinacion_id,
    true,
    NOW()
  )
  RETURNING id INTO v_user_id;
  
  RETURN QUERY
  SELECT 
    v_user_id,
    p_email,
    p_full_name,
    v_role_id,
    p_role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `upload_user_avatar`

**Uso:** Subir avatar de usuario.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION upload_user_avatar(
  p_user_id UUID,
  p_avatar_url TEXT,
  p_filename TEXT DEFAULT NULL,
  p_file_size INTEGER DEFAULT NULL,
  p_mime_type TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Eliminar avatar anterior si existe
  DELETE FROM user_avatars
  WHERE user_id = p_user_id;
  
  -- Insertar nuevo avatar
  INSERT INTO user_avatars (
    user_id,
    avatar_url,
    filename,
    file_size,
    mime_type,
    uploaded_at
  ) VALUES (
    p_user_id,
    p_avatar_url,
    p_filename,
    p_file_size,
    p_mime_type,
    NOW()
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `configure_evaluator_analysis_permissions`

**Uso:** Configurar permisos de análisis para evaluador.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION configure_evaluator_analysis_permissions(
  p_user_id UUID,
  p_permissions JSONB
)
RETURNS JSONB AS $$
DECLARE
  permission_record JSONB;
BEGIN
  -- Eliminar permisos existentes de análisis
  DELETE FROM auth_user_permissions
  WHERE user_id = p_user_id
    AND module = 'analysis';
  
  -- Insertar nuevos permisos
  FOR permission_record IN SELECT * FROM jsonb_array_elements(p_permissions)
  LOOP
    INSERT INTO auth_user_permissions (
      user_id,
      permission_name,
      module,
      sub_module,
      granted_at,
      granted_by
    ) VALUES (
      p_user_id,
      permission_record->>'permission_name',
      'analysis',
      permission_record->>'sub_module',
      NOW(),
      auth.uid()
    );
  END LOOP;
  
  RETURN json_build_object('success', true, 'user_id', p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2.5 Funciones de Logs y Moderación

#### `log_user_login`

**Uso:** Registrar inicio de sesión de usuario.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION log_user_login(
  p_user_id UUID,
  p_email TEXT,
  p_session_token TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_login_status TEXT,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO auth_login_logs (
    user_id,
    email,
    session_token,
    ip_address,
    user_agent,
    login_status,
    failure_reason,
    created_at
  ) VALUES (
    p_user_id,
    p_email,
    p_session_token,
    p_ip_address,
    p_user_agent,
    p_login_status,
    p_failure_reason,
    NOW()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `register_paraphrase_log`

**Uso:** Registrar log de parafraseo.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION register_paraphrase_log(
  p_user_id UUID,
  p_user_email TEXT,
  p_input_text TEXT,
  p_option1 TEXT,
  p_option2 TEXT,
  p_output_selected TEXT,
  p_selected_option_number INTEGER,
  p_has_moderation_warning BOOLEAN DEFAULT false,
  p_warning_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_prospect_id UUID DEFAULT NULL,
  p_model_used TEXT DEFAULT 'claude-3-haiku-20240307',
  p_processing_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO paraphrase_logs (
    user_id,
    user_email,
    input_text,
    option1,
    option2,
    output_selected,
    selected_option_number,
    has_moderation_warning,
    warning_id,
    conversation_id,
    prospect_id,
    model_used,
    processing_time_ms,
    created_at
  ) VALUES (
    p_user_id,
    p_user_email,
    p_input_text,
    p_option1,
    p_option2,
    p_output_selected,
    p_selected_option_number,
    p_has_moderation_warning,
    p_warning_id,
    p_conversation_id,
    p_prospect_id,
    p_model_used,
    p_processing_time_ms,
    NOW()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `get_user_warning_counter`

**Uso:** Obtener contador de advertencias de usuario.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION get_user_warning_counter(p_user_id UUID)
RETURNS TABLE (
  total_warnings INTEGER,
  warnings_last_30_days INTEGER,
  warnings_last_7_days INTEGER,
  last_warning_at TIMESTAMPTZ,
  is_blocked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(uwc.total_warnings, 0),
    COALESCE(uwc.warnings_last_30_days, 0),
    COALESCE(uwc.warnings_last_7_days, 0),
    uwc.last_warning_at,
    COALESCE(uwc.is_blocked, false)
  FROM user_warning_counters uwc
  WHERE uwc.user_id = p_user_id;
  
  -- Si no existe registro, retornar valores por defecto
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 0, 0, 0, NULL::TIMESTAMPTZ, false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `reset_user_warnings`

**Uso:** Resetear contador de advertencias de usuario.

**Script SQL:**
```sql
CREATE OR REPLACE FUNCTION reset_user_warnings(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_warning_counters
  SET 
    total_warnings = 0,
    warnings_last_30_days = 0,
    warnings_last_7_days = 0,
    last_warning_at = NULL,
    is_blocked = false,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Si no existe registro, crear uno
  IF NOT FOUND THEN
    INSERT INTO user_warning_counters (
      user_id,
      total_warnings,
      warnings_last_30_days,
      warnings_last_7_days,
      is_blocked,
      updated_at
    ) VALUES (
      p_user_id,
      0,
      0,
      0,
      false,
      NOW()
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ✅ FASE 3: VERIFICACIÓN DE COMPATIBILIDAD

### 3.1 Comparar Funciones Existentes

**Funciones a verificar:**
1. `authenticate_user`
2. `register_moderation_warning`
3. `is_user_blocked`
4. `get_user_warnings`
5. `create_message_notifications_batch`
6. `create_call_notifications_batch`
7. `update_coordinacion_safe`
8. `archivar_coordinacion_y_reasignar`
9. `get_conversations_ordered`
10. `mark_messages_as_read`
11. `get_conversations_count`
12. `change_user_password`

**Pasos:**
1. Obtener definición de cada función de system_ui
2. Obtener definición de cada función de pqnc_ai
3. Comparar parámetros y tipos de retorno
4. Documentar diferencias
5. Actualizar frontend si es necesario

---

## 🧪 FASE 4: TESTING

### 4.1 Testing de Triggers

1. **Test `trigger_update_warning_counter`:**
   - Insertar advertencia de moderación
   - Verificar que se actualiza `user_warning_counters`

2. **Test `trigger_check_conflicting_labels`:**
   - Intentar insertar etiquetas conflictivas
   - Verificar que se rechaza correctamente

3. **Test `trigger_max_labels_per_prospecto`:**
   - Insertar máximo de etiquetas permitidas
   - Intentar insertar una más
   - Verificar que se rechaza

4. **Test `trigger_max_custom_labels`:**
   - Crear máximo de etiquetas personalizadas
   - Intentar crear una más
   - Verificar que se rechaza

### 4.2 Testing de Funciones RPC

1. Probar cada función RPC migrada con datos de prueba
2. Verificar que retornan los mismos resultados que en system_ui
3. Verificar que el frontend funciona correctamente

---

## 📝 CHECKLIST DE MIGRACIÓN

### Triggers
- [ ] Migrar `update_user_warning_counter()` + trigger
- [ ] Migrar `check_conflicting_labels()` + trigger
- [ ] Migrar `check_max_labels_per_prospecto()` + trigger
- [ ] Migrar `check_max_custom_labels()` + trigger

### Funciones RPC - Notificaciones
- [ ] Migrar `mark_message_notifications_as_read`
- [ ] Migrar `mark_call_notifications_as_read`

### Funciones RPC - Permisos
- [ ] Migrar `get_user_permissions`
- [ ] Migrar `can_user_access_prospect`
- [ ] Migrar `get_user_effective_permissions`
- [ ] Migrar `user_has_permission`

### Funciones RPC - Etiquetas
- [ ] Migrar `get_prospecto_labels`
- [ ] Migrar `can_remove_label_from_prospecto`
- [ ] Migrar `add_label_to_prospecto`
- [ ] Migrar `remove_label_from_prospecto`
- [ ] Migrar `get_batch_prospecto_labels`

### Funciones RPC - Usuarios
- [ ] Migrar `create_user_with_role`
- [ ] Migrar `upload_user_avatar`
- [ ] Migrar `configure_evaluator_analysis_permissions`

### Funciones RPC - Logs
- [ ] Migrar `log_user_login`
- [ ] Migrar `register_paraphrase_log`
- [ ] Migrar `get_user_warning_counter`
- [ ] Migrar `reset_user_warnings`

### Verificación
- [ ] Comparar funciones existentes en ambos proyectos
- [ ] Documentar diferencias
- [ ] Actualizar frontend si es necesario

### Testing
- [ ] Probar todos los triggers migrados
- [ ] Probar todas las funciones RPC migradas
- [ ] Verificar que el frontend funciona correctamente

---

## 🔗 REFERENCIAS

- [Análisis de Triggers y Funciones](./ANALISIS_TRIGGERS_FUNCIONES_MIGRACION.md)
- [Análisis de Migración Completo](./ANALISIS_MIGRACION_SYSTEM_UI_A_PQNC_AI.md)
- [Plan Detallado de Migración](./PLAN_DETALLADO_MIGRACION_SYSTEM_UI_PQNC_AI.md)

---

**Última actualización:** 13 de Enero 2025
