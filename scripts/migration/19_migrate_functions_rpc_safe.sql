-- ============================================
-- MIGRACIÓN SEGURA DE FUNCIONES RPC
-- System_UI → PQNC_AI
-- Fecha: 2025-01-13
-- ============================================
-- 
-- Este script migra las funciones RPC críticas de system_ui a pqnc_ai
-- con verificaciones de seguridad para evitar conflictos
--
-- ⚠️ IMPORTANTE: Ejecutar con permisos de SUPERUSER o service_role
-- ============================================

-- ============================================
-- 1. FUNCIONES DE NOTIFICACIONES
-- ============================================

-- 1.1 mark_message_notifications_as_read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'mark_message_notifications_as_read'
  ) THEN
    CREATE OR REPLACE FUNCTION mark_message_notifications_as_read(
      p_conversation_id uuid,
      p_user_id uuid
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      UPDATE user_notifications
      SET is_read = true,
          read_at = NOW()
      WHERE conversation_id = p_conversation_id
        AND user_id = p_user_id
        AND notification_type = 'new_message'
        AND is_read = false;
    END;
    $$;
    
    RAISE NOTICE '✅ Función mark_message_notifications_as_read() creada';
  ELSE
    RAISE NOTICE '⚠️ Función mark_message_notifications_as_read() ya existe, omitiendo creación';
  END IF;
END $$;

-- 1.2 mark_call_notifications_as_read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'mark_call_notifications_as_read'
  ) THEN
    CREATE OR REPLACE FUNCTION mark_call_notifications_as_read(
      p_call_id character varying,
      p_user_id uuid
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      UPDATE user_notifications
      SET is_read = true,
          read_at = NOW()
      WHERE call_id = p_call_id
        AND user_id = p_user_id
        AND notification_type = 'new_call'
        AND is_read = false;
    END;
    $$;
    
    RAISE NOTICE '✅ Función mark_call_notifications_as_read() creada';
  ELSE
    RAISE NOTICE '⚠️ Función mark_call_notifications_as_read() ya existe, omitiendo creación';
  END IF;
END $$;

-- ============================================
-- 2. FUNCIONES DE PERMISOS
-- ============================================

-- 2.1 get_user_permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_permissions'
  ) THEN
    CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id uuid)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
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
    $$;
    
    RAISE NOTICE '✅ Función get_user_permissions() creada';
  ELSE
    RAISE NOTICE '⚠️ Función get_user_permissions() ya existe, omitiendo creación';
  END IF;
END $$;

-- 2.2 can_user_access_prospect
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_user_access_prospect'
  ) THEN
    CREATE OR REPLACE FUNCTION can_user_access_prospect(
      p_user_id uuid,
      p_prospect_id uuid
    )
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
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
      
      -- Ejecutivo solo puede ver sus prospectos asignados
      IF v_user_role = 'ejecutivo' THEN
        RETURN v_user_coordinacion_id = v_prospect_coordinacion_id
          AND v_prospect_ejecutivo_id = p_user_id;
      END IF;
      
      RETURN false;
    END;
    $$;
    
    RAISE NOTICE '✅ Función can_user_access_prospect() creada';
  ELSE
    RAISE NOTICE '⚠️ Función can_user_access_prospect() ya existe, omitiendo creación';
  END IF;
END $$;

-- 2.3 get_user_effective_permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_effective_permissions'
  ) THEN
    CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id uuid)
    RETURNS TABLE(
      module character varying, 
      action character varying, 
      is_granted boolean, 
      scope_restriction character varying, 
      source_group character varying
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT DISTINCT ON (gp.module, gp.action)
        gp.module,
        gp.action,
        gp.is_granted,
        gp.scope_restriction,
        pg.display_name as source_group
      FROM user_permission_groups upg
      JOIN permission_groups pg ON upg.group_id = pg.id
      JOIN group_permissions gp ON gp.group_id = pg.id
      WHERE upg.user_id = p_user_id
        AND pg.is_active = true
        AND gp.is_granted = true
      ORDER BY gp.module, gp.action, pg.priority DESC;
    END;
    $$;
    
    RAISE NOTICE '✅ Función get_user_effective_permissions() creada';
  ELSE
    RAISE NOTICE '⚠️ Función get_user_effective_permissions() ya existe, omitiendo creación';
  END IF;
END $$;

-- 2.4 user_has_permission
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'user_has_permission'
  ) THEN
    CREATE OR REPLACE FUNCTION user_has_permission(
      p_user_id uuid,
      p_module character varying,
      p_action character varying
    )
    RETURNS TABLE(has_permission boolean, scope_restriction character varying)
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        COALESCE(bool_or(gp.is_granted), false) as has_permission,
        COALESCE(
          (SELECT gp2.scope_restriction 
           FROM group_permissions gp2 
           JOIN user_permission_groups upg2 ON gp2.group_id = upg2.group_id
           JOIN permission_groups pg2 ON upg2.group_id = pg2.id
           WHERE upg2.user_id = p_user_id 
             AND gp2.module = p_module 
             AND gp2.action = p_action
             AND gp2.is_granted = true
             AND pg2.is_active = true
           ORDER BY pg2.priority DESC
           LIMIT 1),
          'none'
        ) as scope_restriction
      FROM user_permission_groups upg
      JOIN permission_groups pg ON upg.group_id = pg.id
      JOIN group_permissions gp ON gp.group_id = pg.id
      WHERE upg.user_id = p_user_id
        AND pg.is_active = true
        AND gp.module = p_module
        AND gp.action = p_action;
    END;
    $$;
    
    RAISE NOTICE '✅ Función user_has_permission() creada';
  ELSE
    RAISE NOTICE '⚠️ Función user_has_permission() ya existe, omitiendo creación';
  END IF;
END $$;

-- ============================================
-- 3. FUNCIONES DE ETIQUETAS WHATSAPP
-- ============================================

-- 3.1 get_prospecto_labels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_prospecto_labels'
  ) THEN
    CREATE OR REPLACE FUNCTION get_prospecto_labels(p_prospecto_id uuid)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', wcl.id::text,
            'label_id', wcl.label_id::text,
            'label_type', wcl.label_type,
            'shadow_cell', wcl.shadow_cell,
            'name', COALESCE(wlp.name, wlc.name, 'Etiqueta eliminada'),
            'color', COALESCE(wlp.color, wlc.color, '#6B7280'),
            'icon', wlp.icon,
            'business_rule', wlp.business_rule
          )
        )
        FROM whatsapp_conversation_labels wcl
        LEFT JOIN whatsapp_labels_preset wlp 
          ON wcl.label_type = 'preset' AND wcl.label_id = wlp.id
        LEFT JOIN whatsapp_labels_custom wlc 
          ON wcl.label_type = 'custom' AND wcl.label_id = wlc.id
        WHERE wcl.prospecto_id = p_prospecto_id
      ), '[]'::json);
    END;
    $$;
    
    RAISE NOTICE '✅ Función get_prospecto_labels() creada';
  ELSE
    RAISE NOTICE '⚠️ Función get_prospecto_labels() ya existe, omitiendo creación';
  END IF;
END $$;

-- 3.2 can_remove_label_from_prospecto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_remove_label_from_prospecto'
  ) THEN
    CREATE OR REPLACE FUNCTION can_remove_label_from_prospecto(
      p_relation_id uuid,
      p_user_id uuid
    )
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      assigned_by_id UUID;
      assigned_by_role VARCHAR(50);
      assigned_by_coordinacion UUID;
      current_user_role VARCHAR(50);
      current_user_coordinaciones UUID[];
      is_coordinador_calidad BOOLEAN := false;
    BEGIN
      -- Obtener info de quien aplicó la etiqueta
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
      
      -- Obtener coordinaciones del usuario
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
    $$;
    
    RAISE NOTICE '✅ Función can_remove_label_from_prospecto() creada';
  ELSE
    RAISE NOTICE '⚠️ Función can_remove_label_from_prospecto() ya existe, omitiendo creación';
  END IF;
END $$;

-- 3.3 add_label_to_prospecto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'add_label_to_prospecto'
  ) THEN
    CREATE OR REPLACE FUNCTION add_label_to_prospecto(
      p_prospecto_id uuid,
      p_label_id uuid,
      p_label_type character varying,
      p_shadow_cell boolean,
      p_user_id uuid
    )
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      label_name TEXT;
      label_color TEXT;
    BEGIN
      -- Validar que la etiqueta existe
      IF p_label_type = 'preset' THEN
        SELECT name, color INTO label_name, label_color
        FROM whatsapp_labels_preset
        WHERE id = p_label_id AND is_active = true;
      ELSE
        SELECT name, color INTO label_name, label_color
        FROM whatsapp_labels_custom
        WHERE id = p_label_id AND user_id = p_user_id AND is_active = true;
      END IF;
      
      IF label_name IS NULL THEN
        RAISE EXCEPTION 'La etiqueta no existe o no está activa';
      END IF;
      
      -- Si shadow_cell es true, desactivar shadow en otras etiquetas
      IF p_shadow_cell THEN
        UPDATE whatsapp_conversation_labels
        SET shadow_cell = false
        WHERE prospecto_id = p_prospecto_id;
      END IF;
      
      -- Insertar o actualizar
      INSERT INTO whatsapp_conversation_labels (
        prospecto_id, label_id, label_type, shadow_cell, added_by
      ) VALUES (
        p_prospecto_id, p_label_id, p_label_type, p_shadow_cell, p_user_id
      )
      ON CONFLICT (prospecto_id, label_id, label_type) 
      DO UPDATE SET shadow_cell = p_shadow_cell;
      
      RETURN json_build_object(
        'label_id', p_label_id::text,
        'label_type', p_label_type,
        'shadow_cell', p_shadow_cell,
        'name', label_name,
        'color', label_color
      );
    END;
    $$;
    
    RAISE NOTICE '✅ Función add_label_to_prospecto() creada';
  ELSE
    RAISE NOTICE '⚠️ Función add_label_to_prospecto() ya existe, omitiendo creación';
  END IF;
END $$;

-- 3.4 remove_label_from_prospecto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'remove_label_from_prospecto'
  ) THEN
    CREATE OR REPLACE FUNCTION remove_label_from_prospecto(
      p_prospecto_id uuid,
      p_label_id uuid,
      p_label_type character varying
    )
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      DELETE FROM whatsapp_conversation_labels
      WHERE prospecto_id = p_prospecto_id
        AND label_id = p_label_id
        AND label_type = p_label_type;
      
      RETURN FOUND;
    END;
    $$;
    
    RAISE NOTICE '✅ Función remove_label_from_prospecto() creada';
  ELSE
    RAISE NOTICE '⚠️ Función remove_label_from_prospecto() ya existe, omitiendo creación';
  END IF;
END $$;

-- 3.5 get_batch_prospecto_labels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_batch_prospecto_labels'
  ) THEN
    CREATE OR REPLACE FUNCTION get_batch_prospecto_labels(p_prospecto_ids uuid[])
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result JSON;
    BEGIN
      -- Ensamblar todas las etiquetas de los prospectos en un solo JSON
      SELECT json_object_agg(
        prospecto_id::text,
        labels
      ) INTO result
      FROM (
        SELECT 
          wcl.prospecto_id,
          json_agg(
            json_build_object(
              'id', wcl.label_id::text,
              'label_id', wcl.label_id::text,
              'label_type', wcl.label_type,
              'shadow_cell', wcl.shadow_cell,
              'name', COALESCE(wlp.name, wlc.name, 'Etiqueta eliminada'),
              'color', COALESCE(wlp.color, wlc.color, '#6B7280'),
              'icon', wlp.icon,
              'business_rule', wlp.business_rule
            )
          ) as labels
        FROM whatsapp_conversation_labels wcl
        LEFT JOIN whatsapp_labels_preset wlp 
          ON wcl.label_type = 'preset' AND wcl.label_id = wlp.id
        LEFT JOIN whatsapp_labels_custom wlc 
          ON wcl.label_type = 'custom' AND wcl.label_id = wlc.id
        WHERE wcl.prospecto_id = ANY(p_prospecto_ids)
        GROUP BY wcl.prospecto_id
      ) sub;
      
      RETURN COALESCE(result, '{}'::json);
    END;
    $$;
    
    RAISE NOTICE '✅ Función get_batch_prospecto_labels() creada';
  ELSE
    RAISE NOTICE '⚠️ Función get_batch_prospecto_labels() ya existe, omitiendo creación';
  END IF;
END $$;

-- ============================================
-- 4. FUNCIONES DE USUARIOS
-- ============================================

-- 4.1 create_user_with_role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_user_with_role'
  ) THEN
    CREATE OR REPLACE FUNCTION create_user_with_role(
      user_email text,
      user_password text,
      user_first_name text,
      user_last_name text,
      user_role_id uuid,
      user_phone text DEFAULT NULL::text,
      user_department text DEFAULT NULL::text,
      user_position text DEFAULT NULL::text,
      user_is_active boolean DEFAULT true
    )
    RETURNS TABLE(user_id uuid, email text, full_name text)
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_user_id UUID;
      v_password_hash TEXT;
      v_full_name TEXT;
    BEGIN
      -- Verificar que el email no existe
      IF EXISTS (SELECT 1 FROM auth_users au WHERE au.email = create_user_with_role.user_email) THEN
        RAISE EXCEPTION 'El email % ya está registrado', user_email;
      END IF;

      -- Verificar que el rol existe
      IF NOT EXISTS (SELECT 1 FROM auth_roles ar WHERE ar.id = create_user_with_role.user_role_id) THEN
        RAISE EXCEPTION 'El rol especificado no existe';
      END IF;

      -- Hash de la contraseña usando pgcrypto
      v_password_hash := crypt(create_user_with_role.user_password, gen_salt('bf'));

      -- Construir nombre completo
      v_full_name := TRIM(create_user_with_role.user_first_name || ' ' || COALESCE(create_user_with_role.user_last_name, ''));

      -- Crear usuario
      INSERT INTO auth_users (
        email,
        password_hash,
        full_name,
        first_name,
        last_name,
        phone,
        role_id,
        is_active,
        email_verified,
        created_at,
        updated_at
      )
      VALUES (
        create_user_with_role.user_email,
        v_password_hash,
        v_full_name,
        create_user_with_role.user_first_name,
        create_user_with_role.user_last_name,
        create_user_with_role.user_phone,
        create_user_with_role.user_role_id,
        create_user_with_role.user_is_active,
        false,
        NOW(),
        NOW()
      )
      RETURNING id INTO v_user_id;

      -- Retornar datos del usuario creado
      RETURN QUERY SELECT v_user_id, create_user_with_role.user_email, v_full_name;
    END;
    $$;
    
    RAISE NOTICE '✅ Función create_user_with_role() creada';
  ELSE
    RAISE NOTICE '⚠️ Función create_user_with_role() ya existe, omitiendo creación';
  END IF;
END $$;

-- 4.2 upload_user_avatar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'upload_user_avatar'
  ) THEN
    CREATE OR REPLACE FUNCTION upload_user_avatar(
      p_user_id uuid,
      p_avatar_url text,
      p_filename text DEFAULT NULL::text,
      p_file_size integer DEFAULT NULL::integer,
      p_mime_type text DEFAULT NULL::text,
      p_file_name text DEFAULT NULL::text
    )
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_filename TEXT;
    BEGIN
      -- Verificar que el usuario existe
      IF NOT EXISTS (SELECT 1 FROM auth_users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Usuario no encontrado';
      END IF;

      -- Usar p_file_name si está disponible, sino p_filename
      v_filename := COALESCE(p_file_name, p_filename);

      -- Si p_avatar_url es NULL, eliminar avatar existente
      IF p_avatar_url IS NULL THEN
        DELETE FROM user_avatars WHERE user_id = p_user_id;
        RETURN TRUE;
      END IF;

      -- Eliminar avatar existente primero
      DELETE FROM user_avatars WHERE user_id = p_user_id;

      -- Insertar nuevo avatar
      INSERT INTO user_avatars (
        user_id,
        avatar_url,
        filename,
        file_size,
        mime_type,
        uploaded_at
      )
      VALUES (
        p_user_id,
        p_avatar_url,
        v_filename,
        p_file_size,
        p_mime_type,
        NOW()
      );

      RETURN TRUE;
    END;
    $$;
    
    RAISE NOTICE '✅ Función upload_user_avatar() creada';
  ELSE
    RAISE NOTICE '⚠️ Función upload_user_avatar() ya existe, omitiendo creación';
  END IF;
END $$;

-- 4.3 configure_evaluator_analysis_permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'configure_evaluator_analysis_permissions'
  ) THEN
    CREATE OR REPLACE FUNCTION configure_evaluator_analysis_permissions(
      p_target_user_id uuid,
      p_natalia_access boolean DEFAULT false,
      p_pqnc_access boolean DEFAULT false,
      p_live_monitor_access boolean DEFAULT false
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_result JSONB;
    BEGIN
      -- Verificar que el usuario existe
      IF NOT EXISTS (SELECT 1 FROM auth_users WHERE id = p_target_user_id) THEN
        RAISE EXCEPTION 'Usuario no encontrado';
      END IF;

      -- Eliminar permisos de análisis existentes para este usuario
      DELETE FROM auth_user_permissions
      WHERE user_id = p_target_user_id
        AND module = 'analisis'
        AND sub_module IN ('natalia', 'pqnc', 'live_monitor');

      -- Insertar nuevos permisos según los parámetros
      IF p_natalia_access THEN
        INSERT INTO auth_user_permissions (user_id, permission_name, module, sub_module)
        VALUES (p_target_user_id, 'analisis.natalia.view', 'analisis', 'natalia')
        ON CONFLICT DO NOTHING;
      END IF;

      IF p_pqnc_access THEN
        INSERT INTO auth_user_permissions (user_id, permission_name, module, sub_module)
        VALUES (p_target_user_id, 'analisis.pqnc.view', 'analisis', 'pqnc')
        ON CONFLICT DO NOTHING;
      END IF;

      IF p_live_monitor_access THEN
        INSERT INTO auth_user_permissions (user_id, permission_name, module, sub_module)
        VALUES (p_target_user_id, 'analisis.live_monitor.view', 'analisis', 'live_monitor')
        ON CONFLICT DO NOTHING;
      END IF;

      -- Retornar resultado
      v_result := jsonb_build_object(
        'success', true,
        'user_id', p_target_user_id,
        'permissions', jsonb_build_object(
          'natalia', p_natalia_access,
          'pqnc', p_pqnc_access,
          'live_monitor', p_live_monitor_access
        )
      );

      RETURN v_result;
    END;
    $$;
    
    RAISE NOTICE '✅ Función configure_evaluator_analysis_permissions() creada';
  ELSE
    RAISE NOTICE '⚠️ Función configure_evaluator_analysis_permissions() ya existe, omitiendo creación';
  END IF;
END $$;

-- ============================================
-- 5. FUNCIONES DE LOGS Y MODERACIÓN
-- ============================================

-- 5.1 log_user_login
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'log_user_login'
  ) THEN
    CREATE OR REPLACE FUNCTION log_user_login(
      p_email character varying,
      p_ip_address character varying,
      p_user_agent text,
      p_login_status character varying,
      p_user_id uuid DEFAULT NULL::uuid,
      p_session_token character varying DEFAULT NULL::character varying,
      p_failure_reason text DEFAULT NULL::text,
      p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone
    )
    RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_log_id UUID;
      v_device_type VARCHAR(50);
      v_browser VARCHAR(100);
      v_browser_version VARCHAR(50);
      v_os VARCHAR(100);
      v_os_version VARCHAR(50);
      v_is_suspicious BOOLEAN := false;
      v_suspicious_reasons TEXT[] := ARRAY[]::TEXT[];
      v_ip_count INTEGER := 0;
    BEGIN
      IF p_user_agent LIKE '%Mobile%' OR p_user_agent LIKE '%Android%' OR p_user_agent LIKE '%iPhone%' THEN
        v_device_type := 'mobile';
      ELSIF p_user_agent LIKE '%Tablet%' OR p_user_agent LIKE '%iPad%' THEN
        v_device_type := 'tablet';
      ELSE
        v_device_type := 'desktop';
      END IF;

      IF p_user_agent LIKE '%Chrome%' AND p_user_agent NOT LIKE '%Edge%' THEN
        v_browser := 'Chrome';
      ELSIF p_user_agent LIKE '%Firefox%' THEN
        v_browser := 'Firefox';
      ELSIF p_user_agent LIKE '%Safari%' AND p_user_agent NOT LIKE '%Chrome%' THEN
        v_browser := 'Safari';
      ELSIF p_user_agent LIKE '%Edge%' THEN
        v_browser := 'Edge';
      ELSE
        v_browser := 'Unknown';
      END IF;

      IF p_login_status = 'success' AND p_user_id IS NOT NULL THEN
        SELECT COUNT(DISTINCT ip_address) INTO v_ip_count
        FROM auth_login_logs
        WHERE user_id = p_user_id
          AND created_at > NOW() - INTERVAL '2 hours'
          AND login_status = 'success'
          AND ip_address IS DISTINCT FROM p_ip_address;
        
        IF v_ip_count > 0 THEN
          v_is_suspicious := true;
          v_suspicious_reasons := ARRAY['Multiple IP addresses in short time'];
        END IF;
      END IF;

      INSERT INTO auth_login_logs (
        user_id, email, session_token, ip_address, user_agent,
        device_type, browser, browser_version, os, os_version,
        login_status, failure_reason, expires_at, is_suspicious, suspicious_reasons
      ) VALUES (
        p_user_id, p_email, p_session_token, p_ip_address, p_user_agent,
        v_device_type, v_browser, v_browser_version, 'Unknown', 'Unknown',
        p_login_status, p_failure_reason, p_expires_at, v_is_suspicious, v_suspicious_reasons
      ) RETURNING id INTO v_log_id;

      RETURN v_log_id;
    END;
    $$;
    
    RAISE NOTICE '✅ Función log_user_login() creada';
  ELSE
    RAISE NOTICE '⚠️ Función log_user_login() ya existe, omitiendo creación';
  END IF;
END $$;

-- 5.2 register_paraphrase_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'register_paraphrase_log'
  ) THEN
    CREATE OR REPLACE FUNCTION register_paraphrase_log(
      p_user_id uuid,
      p_user_email character varying,
      p_input_text text,
      p_option1 text,
      p_option2 text,
      p_output_selected text DEFAULT NULL::text,
      p_selected_option_number integer DEFAULT NULL::integer,
      p_has_moderation_warning boolean DEFAULT false,
      p_warning_id uuid DEFAULT NULL::uuid,
      p_conversation_id uuid DEFAULT NULL::uuid,
      p_prospect_id uuid DEFAULT NULL::uuid,
      p_processing_time_ms integer DEFAULT NULL::integer
    )
    RETURNS uuid
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      v_log_id UUID;
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
        processing_time_ms
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
        p_processing_time_ms
      ) RETURNING id INTO v_log_id;
      
      RETURN v_log_id;
    END;
    $$;
    
    RAISE NOTICE '✅ Función register_paraphrase_log() creada';
  ELSE
    RAISE NOTICE '⚠️ Función register_paraphrase_log() ya existe, omitiendo creación';
  END IF;
END $$;

-- 5.3 get_user_warning_counter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_warning_counter'
  ) THEN
    CREATE OR REPLACE FUNCTION get_user_warning_counter(p_user_id uuid)
    RETURNS TABLE(
      total_warnings integer, 
      warnings_last_30_days integer, 
      warnings_last_7_days integer, 
      last_warning_at timestamp with time zone, 
      is_blocked boolean
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        COALESCE(uwc.total_warnings, 0)::INTEGER,
        COALESCE(uwc.warnings_last_30_days, 0)::INTEGER,
        COALESCE(uwc.warnings_last_7_days, 0)::INTEGER,
        uwc.last_warning_at,
        COALESCE(uwc.is_blocked, false)::BOOLEAN
      FROM user_warning_counters uwc
      WHERE uwc.user_id = p_user_id;
      
      -- Si no existe, retornar ceros
      IF NOT FOUND THEN
        RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER, NULL::TIMESTAMP WITH TIME ZONE, false::BOOLEAN;
      END IF;
    END;
    $$;
    
    RAISE NOTICE '✅ Función get_user_warning_counter() creada';
  ELSE
    RAISE NOTICE '⚠️ Función get_user_warning_counter() ya existe, omitiendo creación';
  END IF;
END $$;

-- 5.4 reset_user_warnings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'reset_user_warnings'
  ) THEN
    CREATE OR REPLACE FUNCTION reset_user_warnings(p_user_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      DELETE FROM user_warning_counters
      WHERE user_id = p_user_id;
      
      RETURN true;
    END;
    $$;
    
    RAISE NOTICE '✅ Función reset_user_warnings() creada';
  ELSE
    RAISE NOTICE '⚠️ Función reset_user_warnings() ya existe, omitiendo creación';
  END IF;
END $$;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT 
    'Funciones RPC migradas' as resumen,
    COUNT(*) as total
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'mark_message_notifications_as_read',
    'mark_call_notifications_as_read',
    'get_user_permissions',
    'can_user_access_prospect',
    'get_user_effective_permissions',
    'user_has_permission',
    'get_prospecto_labels',
    'can_remove_label_from_prospecto',
    'add_label_to_prospecto',
    'remove_label_from_prospecto',
    'get_batch_prospecto_labels',
    'create_user_with_role',
    'upload_user_avatar',
    'configure_evaluator_analysis_permissions',
    'log_user_login',
    'register_paraphrase_log',
    'get_user_warning_counter',
    'reset_user_warnings'
  );
