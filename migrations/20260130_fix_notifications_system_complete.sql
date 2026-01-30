-- ============================================
-- MIGRACIÓN: Corrección Completa del Sistema de Notificaciones
-- ============================================
-- Fecha: 2026-01-30
-- Objetivo: Corregir todos los problemas identificados en el sistema de notificaciones
-- 
-- Problemas corregidos:
--   1. Inconsistencia admin (role_id vs role_name)
--   2. Duplicación de notificaciones
--   3. Notificaciones masivas irrelevantes
--   4. No hay limpieza al reasignar
--   5. Falta RLS en support_ticket_views
--   6. notify_status_change notifica cambios irrelevantes
--   7. Admin asignado no notificado cuando otro admin comenta

-- ============================================
-- PASO 1: FUNCIÓN HELPER is_support_admin()
-- ============================================
-- Centraliza la lógica de verificación de admin
-- Usa role_id para consistencia con get_support_admin_ids()

CREATE OR REPLACE FUNCTION is_support_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth_users
    WHERE id = user_id_param
    AND role_id IN (
      '12690827-493e-447b-ac2f-40174fe17389',  -- admin
      '34cc26d1-8a96-4be2-833e-7a13d5553722',  -- administrador_operativo
      '59386336-794d-40de-83a4-de73681d6904'   -- developer
    )
    AND is_active = true
  );
END;
$$;

COMMENT ON FUNCTION is_support_admin(UUID) IS 'Verifica si un usuario es admin de soporte (admin, admin_operativo, developer)';

-- ============================================
-- PASO 2: CORREGIR notify_new_ticket()
-- ============================================
-- Si el ticket ya tiene asignación, NO notificar a todos los admins
-- Solo notificar al asignado o grupo asignado

CREATE OR REPLACE FUNCTION notify_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id UUID;
  role_user_id UUID;
BEGIN
  -- Skip notificaciones si el reporter es el usuario system
  IF is_system_user(NEW.reporter_id) THEN
    RETURN NEW;
  END IF;
  
  -- Caso 1: Ticket creado con usuario específico asignado
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO support_ticket_notifications (
      user_id, 
      ticket_id, 
      type, 
      message,
      assignment_context
    ) VALUES (
      NEW.assigned_to, 
      NEW.id, 
      'new_ticket', 
      'Nuevo ticket asignado: ' || NEW.ticket_number || ' - ' || NEW.title,
      'specific_user'
    );
    RETURN NEW;
  END IF;
  
  -- Caso 2: Ticket creado con rol asignado
  IF NEW.assigned_to_role IS NOT NULL THEN
    FOR role_user_id IN
      SELECT user_id FROM get_users_by_role(NEW.assigned_to_role)
    LOOP
      INSERT INTO support_ticket_notifications (
        user_id, 
        ticket_id, 
        type, 
        message,
        assignment_context
      ) VALUES (
        role_user_id, 
        NEW.id, 
        'new_ticket', 
        'Nuevo ticket para tu grupo: ' || NEW.ticket_number || ' - ' || NEW.title,
        'role_group'
      );
    END LOOP;
    RETURN NEW;
  END IF;
  
  -- Caso 3: Ticket sin asignación → Notificar a TODOS los admins
  FOR admin_id IN
    SELECT * FROM get_support_admin_ids()
  LOOP
    INSERT INTO support_ticket_notifications (
      user_id, 
      ticket_id, 
      type, 
      message,
      assignment_context
    ) VALUES (
      admin_id, 
      NEW.id, 
      'new_ticket', 
      'Nuevo ticket: ' || NEW.ticket_number || ' - ' || NEW.title,
      'all_admins'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_new_ticket() IS 'Notifica nuevo ticket respetando asignación previa';

-- ============================================
-- PASO 3: CORREGIR notify_new_comment()
-- ============================================
-- Usa is_support_admin() para consistencia
-- Notifica al admin asignado si otro admin comenta

CREATE OR REPLACE FUNCTION notify_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ticket_record RECORD;
  commenter_is_admin BOOLEAN;
  target_user_id UUID;
  role_user_id UUID;
BEGIN
  -- Obtener datos del ticket
  SELECT 
    t.reporter_id,
    t.ticket_number,
    t.assigned_to,
    t.assigned_to_role
  INTO ticket_record
  FROM support_tickets t
  WHERE t.id = NEW.ticket_id;
  
  -- Verificar si comentarista es admin usando función helper
  SELECT is_support_admin(NEW.user_id) INTO commenter_is_admin;
  
  -- Actualizar last_comment en support_tickets
  UPDATE support_tickets
  SET 
    last_comment_at = NOW(),
    last_comment_by = NEW.user_id,
    last_comment_by_role = NEW.user_role
  WHERE id = NEW.ticket_id;
  
  -- CASO 1: Admin comenta → Notificar al reporter (si no es system y no es interno)
  IF commenter_is_admin AND NEW.is_internal = FALSE THEN
    -- Notificar al reporter
    IF ticket_record.reporter_id != NEW.user_id 
       AND NOT is_system_user(ticket_record.reporter_id) THEN
      INSERT INTO support_ticket_notifications (
        user_id, 
        ticket_id, 
        type, 
        message,
        assignment_context
      ) VALUES (
        ticket_record.reporter_id,
        NEW.ticket_id,
        'new_comment',
        'Nueva respuesta en tu ticket ' || ticket_record.ticket_number,
        'reporter'
      );
    END IF;
    
    -- NUEVO: Notificar al admin asignado (si existe y no es quien comentó)
    IF ticket_record.assigned_to IS NOT NULL 
       AND ticket_record.assigned_to != NEW.user_id THEN
      INSERT INTO support_ticket_notifications (
        user_id,
        ticket_id,
        type,
        message,
        assignment_context
      ) VALUES (
        ticket_record.assigned_to,
        NEW.ticket_id,
        'new_comment',
        'Nuevo comentario de colega en ' || ticket_record.ticket_number,
        'specific_user'
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- CASO 2: Cliente/Usuario comenta → Notificar según asignación
  IF NOT commenter_is_admin THEN
    
    -- Sub-caso 2.1: Asignado a usuario específico
    IF ticket_record.assigned_to IS NOT NULL THEN
      IF ticket_record.assigned_to != NEW.user_id THEN
        INSERT INTO support_ticket_notifications (
          user_id,
          ticket_id,
          type,
          message,
          assignment_context
        ) VALUES (
          ticket_record.assigned_to,
          NEW.ticket_id,
          'new_comment',
          'Nuevo comentario del cliente en ' || ticket_record.ticket_number,
          'specific_user'
        );
      END IF;
      RETURN NEW; -- No notificar a nadie más
    END IF;
    
    -- Sub-caso 2.2: Asignado a grupo de roles
    IF ticket_record.assigned_to_role IS NOT NULL THEN
      FOR role_user_id IN
        SELECT user_id FROM get_users_by_role(ticket_record.assigned_to_role)
      LOOP
        IF role_user_id != NEW.user_id THEN
          INSERT INTO support_ticket_notifications (
            user_id,
            ticket_id,
            type,
            message,
            assignment_context
          ) VALUES (
            role_user_id,
            NEW.ticket_id,
            'new_comment',
            'Nuevo comentario del cliente en ' || ticket_record.ticket_number,
            'role_group'
          );
        END IF;
      END LOOP;
      RETURN NEW; -- No notificar a nadie más
    END IF;
    
    -- Sub-caso 2.3: Sin asignación → Notificar solo a admins que ya vieron el ticket
    INSERT INTO support_ticket_notifications (
      user_id, ticket_id, type, message, assignment_context
    )
    SELECT 
      v.user_id, 
      NEW.ticket_id, 
      'new_comment',
      'Nuevo comentario en ticket sin asignar ' || ticket_record.ticket_number,
      'involved_admin'
    FROM support_ticket_views v
    WHERE v.ticket_id = NEW.ticket_id
      AND v.user_id != NEW.user_id
      AND is_support_admin(v.user_id);
    
    -- Si NO hay admins involucrados, notificar a todos los admins
    IF NOT FOUND THEN
      FOR target_user_id IN
        SELECT * FROM get_support_admin_ids()
      LOOP
        IF target_user_id != NEW.user_id THEN
          INSERT INTO support_ticket_notifications (
            user_id,
            ticket_id,
            type,
            message,
            assignment_context
          ) VALUES (
            target_user_id,
            NEW.ticket_id,
            'new_comment',
            'Nuevo comentario en ' || ticket_record.ticket_number,
            'all_admins'
          );
        END IF;
      END LOOP;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_new_comment() IS 'Notifica comentarios con lógica consistente y sin duplicados';

-- ============================================
-- PASO 4: CORREGIR notify_ticket_assignment()
-- ============================================
-- Limpia notificaciones al reasignar
-- Previene duplicados
-- Notifica al usuario desasignado

CREATE OR REPLACE FUNCTION notify_ticket_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  role_user_id UUID;
  old_assigned_user UUID;
  existing_notification_id UUID;
BEGIN
  -- Solo procesar si cambió la asignación
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR 
     OLD.assigned_to_role IS DISTINCT FROM NEW.assigned_to_role THEN
    
    -- Guardar usuario previamente asignado
    old_assigned_user := OLD.assigned_to;
    
    -- NUEVO: Marcar como leídas las notificaciones previas de otros usuarios
    -- Esto limpia el ruido para usuarios que ya no están asignados
    UPDATE support_ticket_notifications
    SET is_read = true
    WHERE ticket_id = NEW.id
      AND user_id != COALESCE(NEW.assigned_to, '00000000-0000-0000-0000-000000000000')
      AND assignment_context IN ('all_admins', 'role_group')
      AND type = 'new_ticket'
      AND is_read = false;
    
    -- NUEVO: Notificar al usuario desasignado (si existe y cambió)
    IF old_assigned_user IS NOT NULL 
       AND (NEW.assigned_to IS NULL OR old_assigned_user != NEW.assigned_to) THEN
      INSERT INTO support_ticket_notifications (
        user_id, ticket_id, type, message, assignment_context
      ) VALUES (
        old_assigned_user, 
        NEW.id, 
        'assigned',  -- Usamos 'assigned' con mensaje de desasignación
        'El ticket ' || NEW.ticket_number || ' fue reasignado',
        'former_assignee'
      );
    END IF;
    
    -- Caso 1: Asignado a usuario específico
    IF NEW.assigned_to IS NOT NULL THEN
      -- NUEVO: Verificar si ya existe notificación no leída para evitar duplicados
      SELECT id INTO existing_notification_id
      FROM support_ticket_notifications
      WHERE user_id = NEW.assigned_to
        AND ticket_id = NEW.id
        AND type IN ('new_ticket', 'assigned')
        AND is_read = false
      LIMIT 1;
      
      IF existing_notification_id IS NULL THEN
        INSERT INTO support_ticket_notifications (
          user_id, 
          ticket_id, 
          type, 
          message,
          assignment_context
        ) VALUES (
          NEW.assigned_to,
          NEW.id,
          'assigned',
          'Te asignaron el ticket ' || NEW.ticket_number,
          'specific_user'
        );
      END IF;
    
    -- Caso 2: Asignado a grupo de roles
    ELSIF NEW.assigned_to_role IS NOT NULL THEN
      FOR role_user_id IN
        SELECT user_id FROM get_users_by_role(NEW.assigned_to_role)
      LOOP
        -- Verificar duplicados por usuario
        SELECT id INTO existing_notification_id
        FROM support_ticket_notifications
        WHERE user_id = role_user_id
          AND ticket_id = NEW.id
          AND type IN ('new_ticket', 'assigned')
          AND is_read = false
        LIMIT 1;
        
        IF existing_notification_id IS NULL THEN
          INSERT INTO support_ticket_notifications (
            user_id,
            ticket_id,
            type,
            message,
            assignment_context
          ) VALUES (
            role_user_id,
            NEW.id,
            'assigned',
            'Nuevo ticket asignado a tu grupo: ' || NEW.ticket_number,
            'role_group'
          );
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_ticket_assignment() IS 'Notifica asignación con deduplicación y limpieza';

-- ============================================
-- PASO 5: CORREGIR notify_status_change()
-- ============================================
-- Solo notificar estados finales (resuelto, cerrado, cancelado)

CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo notificar si el status cambió a un estado FINAL
  IF OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status IN ('resuelto', 'cerrado', 'cancelado')
     AND NOT is_system_user(NEW.reporter_id) THEN
    
    INSERT INTO support_ticket_notifications (
      user_id, 
      ticket_id, 
      type, 
      message,
      assignment_context
    ) VALUES (
      NEW.reporter_id, 
      NEW.id, 
      'status_change',
      'Tu ticket ' || NEW.ticket_number || ' fue ' || 
      CASE 
        WHEN NEW.status = 'resuelto' THEN 'marcado como resuelto'
        WHEN NEW.status = 'cerrado' THEN 'cerrado'
        WHEN NEW.status = 'cancelado' THEN 'cancelado'
      END,
      'reporter'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_status_change() IS 'Solo notifica estados finales al reporter';

-- ============================================
-- PASO 6: AGREGAR RLS A support_ticket_views
-- ============================================

-- Habilitar RLS
ALTER TABLE support_ticket_views ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver/actualizar sus propias views
DROP POLICY IF EXISTS "Users can manage own views" ON support_ticket_views;
CREATE POLICY "Users can manage own views" 
  ON support_ticket_views
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política: Service role tiene acceso completo (para RPC mark_ticket_viewed)
DROP POLICY IF EXISTS "Service role full access views" ON support_ticket_views;
CREATE POLICY "Service role full access views"
  ON support_ticket_views
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- PASO 7: AGREGAR ÍNDICE COMPUESTO PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_ticket_read 
  ON support_ticket_notifications(user_id, ticket_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_type_context 
  ON support_ticket_notifications(type, assignment_context, is_read);

-- ============================================
-- PASO 8: AGREGAR assignment_context = 'former_assignee' AL CHECK
-- ============================================

-- Primero verificar y actualizar el constraint
DO $$
BEGIN
  -- Intentar agregar el nuevo valor al check constraint
  ALTER TABLE support_ticket_notifications 
    DROP CONSTRAINT IF EXISTS support_ticket_notifications_assignment_context_check;
  
  ALTER TABLE support_ticket_notifications 
    ADD CONSTRAINT support_ticket_notifications_assignment_context_check 
    CHECK (assignment_context IN ('all_admins', 'role_group', 'specific_user', 'reporter', 'involved_admin', 'former_assignee'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Constraint ya actualizado o error: %', SQLERRM;
END;
$$;

-- ============================================
-- PASO 9: RECREAR TRIGGERS (por si cambiaron)
-- ============================================

DROP TRIGGER IF EXISTS trigger_notify_new_ticket ON support_tickets;
CREATE TRIGGER trigger_notify_new_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_ticket();

DROP TRIGGER IF EXISTS trigger_notify_new_comment ON support_ticket_comments;
CREATE TRIGGER trigger_notify_new_comment
  AFTER INSERT ON support_ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_comment();

DROP TRIGGER IF EXISTS trigger_notify_assignment ON support_tickets;
CREATE TRIGGER trigger_notify_assignment
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  WHEN (
    OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR 
    OLD.assigned_to_role IS DISTINCT FROM NEW.assigned_to_role
  )
  EXECUTE FUNCTION notify_ticket_assignment();

DROP TRIGGER IF EXISTS trigger_notify_status_change ON support_tickets;
CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_status_change();

-- ============================================
-- PASO 10: LIMPIAR NOTIFICACIONES ANTIGUAS
-- ============================================
-- Marcar como leídas notificaciones de tickets cerrados (> 7 días)

UPDATE support_ticket_notifications n
SET is_read = true
FROM support_tickets t
WHERE n.ticket_id = t.id
  AND t.status IN ('resuelto', 'cerrado', 'cancelado')
  AND n.created_at < NOW() - INTERVAL '7 days'
  AND n.is_read = false;

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================

COMMENT ON TABLE support_ticket_notifications IS 'Notificaciones de tickets - Corregido 2026-01-30';
