-- ============================================
-- MODIFICAR NOTIFICACIONES PARA SKIP TICKETS SYSTEM
-- ============================================
-- Fecha: 2026-01-24
-- Objetivo: NO enviar notificaciones cuando el reporter es el usuario system

-- Constante para ID del usuario system
CREATE OR REPLACE FUNCTION is_system_user(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN user_id_param = '00000000-0000-0000-0000-000000000001';
END;
$$;

-- ============================================
-- REESCRIBIR notify_new_ticket (v2)
-- ============================================
-- NO notificar a nadie si el reporter es system
-- (Los tickets system se crean pre-asignados)

CREATE OR REPLACE FUNCTION notify_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Skip notificaciones si el reporter es el usuario system
  IF is_system_user(NEW.reporter_id) THEN
    RETURN NEW;
  END IF;
  
  -- Notificar a TODOS los administradores (admin, administrador_operativo, coordinador)
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

-- ============================================
-- REESCRIBIR notify_new_comment (v2)
-- ============================================
-- Skip notificar al reporter si es system

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
  
  -- Verificar si comentarista es admin
  SELECT EXISTS (
    SELECT 1 FROM user_profiles_v2
    WHERE id = NEW.user_id 
    AND role_name IN ('admin', 'administrador_operativo', 'coordinador')
  ) INTO commenter_is_admin;
  
  -- Actualizar last_comment en support_tickets
  UPDATE support_tickets
  SET 
    last_comment_at = NOW(),
    last_comment_by = NEW.user_id,
    last_comment_by_role = NEW.user_role
  WHERE id = NEW.ticket_id;
  
  -- CASO 1: Admin/Asignado comenta → Notificar al reporter (SOLO si NO es system)
  IF commenter_is_admin AND NEW.is_internal = FALSE THEN
    IF ticket_record.reporter_id != NEW.user_id AND NOT is_system_user(ticket_record.reporter_id) THEN
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
  
  -- CASO 2: Cliente comenta → Notificar según asignación
  ELSIF NOT commenter_is_admin THEN
    
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
          'Nuevo comentario en ' || ticket_record.ticket_number,
          'specific_user'
        );
      END IF;
    
    -- Sub-caso 2.2: Asignado a grupo de roles
    ELSIF ticket_record.assigned_to_role IS NOT NULL THEN
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
            'Nuevo comentario en ' || ticket_record.ticket_number,
            'role_group'
          );
        END IF;
      END LOOP;
    
    -- Sub-caso 2.3: Sin asignación → Notificar a todos los admins
    ELSE
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

-- ============================================
-- RECREAR TRIGGERS
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
