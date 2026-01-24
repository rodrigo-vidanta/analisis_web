-- ============================================
-- MIGRACIÓN: Sistema de Notificaciones Contextual de Tickets
-- ============================================
-- Fecha: 2026-01-23
-- Objetivo: Implementar notificaciones según asignación (all_admins → grupo → usuario específico)
--           con sistema de "visto" para badges "Nuevo" y "Mensaje"

-- ============================================
-- PASO 1: NUEVA TABLA - support_ticket_views
-- ============================================
-- Tracking de visualizaciones de tickets por usuario

CREATE TABLE IF NOT EXISTS support_ticket_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_comment_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);

CREATE INDEX idx_ticket_views_ticket ON support_ticket_views(ticket_id);
CREATE INDEX idx_ticket_views_user ON support_ticket_views(user_id);
CREATE INDEX idx_ticket_views_composite ON support_ticket_views(ticket_id, user_id);

-- ============================================
-- PASO 2: MODIFICAR support_tickets
-- ============================================
-- Agregar columnas para tracking de último comentario

ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS last_comment_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_comment_by UUID,
ADD COLUMN IF NOT EXISTS last_comment_by_role VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_tickets_last_comment ON support_tickets(last_comment_at DESC);

-- ============================================
-- PASO 3: MODIFICAR support_ticket_notifications
-- ============================================
-- Agregar contexto de asignación

ALTER TABLE support_ticket_notifications
ADD COLUMN IF NOT EXISTS assignment_context VARCHAR(20) CHECK (assignment_context IN ('all_admins', 'role_group', 'specific_user', 'reporter'));

CREATE INDEX IF NOT EXISTS idx_notifications_context ON support_ticket_notifications(user_id, assignment_context, is_read);

-- ============================================
-- PASO 4: FUNCIÓN - get_users_by_role
-- ============================================
-- Obtener usuarios por rol específico

CREATE OR REPLACE FUNCTION get_users_by_role(role_name_param TEXT)
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT id
  FROM user_profiles_v2
  WHERE role_name = role_name_param 
    AND is_active = true;
END;
$$;

-- ============================================
-- PASO 5: REESCRIBIR notify_new_ticket
-- ============================================
-- Notificar a TODOS los admins cuando se crea un ticket

CREATE OR REPLACE FUNCTION notify_new_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id UUID;
BEGIN
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
-- PASO 6: FUNCIÓN - notify_ticket_assignment
-- ============================================
-- Notificar cuando un ticket es asignado a grupo o usuario

CREATE OR REPLACE FUNCTION notify_ticket_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
  role_user_id UUID;
BEGIN
  -- Solo procesar si cambió la asignación
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR 
     OLD.assigned_to_role IS DISTINCT FROM NEW.assigned_to_role THEN
    
    -- Caso 1: Asignado a usuario específico
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
        'assigned',
        'Te asignaron el ticket ' || NEW.ticket_number,
        'specific_user'
      );
    
    -- Caso 2: Asignado a grupo de roles
    ELSIF NEW.assigned_to_role IS NOT NULL THEN
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
          'assigned',
          'Nuevo ticket asignado a tu grupo: ' || NEW.ticket_number,
          'role_group'
        );
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- PASO 7: REESCRIBIR notify_new_comment
-- ============================================
-- Lógica contextual de notificaciones según asignación

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
  
  -- Verificar si comentarista es admin usando la función existente
  -- (asumiendo que existe is_support_admin() o similar)
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
  
  -- CASO 1: Admin/Asignado comenta → Notificar al reporter
  IF commenter_is_admin AND NEW.is_internal = FALSE THEN
    IF ticket_record.reporter_id != NEW.user_id THEN
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
-- PASO 8: FUNCIÓN - mark_ticket_viewed
-- ============================================
-- Marcar ticket como visto por un usuario

CREATE OR REPLACE FUNCTION mark_ticket_viewed(
  ticket_id_param UUID,
  user_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ticket_last_comment TIMESTAMPTZ;
BEGIN
  -- Obtener timestamp del último comentario
  SELECT last_comment_at INTO ticket_last_comment
  FROM support_tickets
  WHERE id = ticket_id_param;
  
  -- Insertar o actualizar registro de visualización
  INSERT INTO support_ticket_views (
    ticket_id,
    user_id,
    last_viewed_at,
    last_comment_read_at
  ) VALUES (
    ticket_id_param,
    user_id_param,
    NOW(),
    ticket_last_comment
  )
  ON CONFLICT (ticket_id, user_id)
  DO UPDATE SET
    last_viewed_at = NOW(),
    last_comment_read_at = ticket_last_comment;
    
  -- Marcar notificaciones de este ticket como leídas
  UPDATE support_ticket_notifications
  SET is_read = true
  WHERE ticket_id = ticket_id_param 
    AND user_id = user_id_param 
    AND is_read = false;
END;
$$;

-- ============================================
-- PASO 9: CREAR TRIGGER para Asignación
-- ============================================

DROP TRIGGER IF EXISTS trigger_notify_assignment ON support_tickets;

CREATE TRIGGER trigger_notify_assignment
AFTER UPDATE ON support_tickets
FOR EACH ROW
WHEN (
  OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR 
  OLD.assigned_to_role IS DISTINCT FROM NEW.assigned_to_role
)
EXECUTE FUNCTION notify_ticket_assignment();

-- ============================================
-- PASO 10: RECREAR TRIGGER para Comentarios
-- ============================================

DROP TRIGGER IF EXISTS trigger_notify_new_comment ON support_ticket_comments;

CREATE TRIGGER trigger_notify_new_comment
AFTER INSERT ON support_ticket_comments
FOR EACH ROW
EXECUTE FUNCTION notify_new_comment();

-- ============================================
-- PASO 11: RECREAR TRIGGER para Nuevo Ticket
-- ============================================

DROP TRIGGER IF EXISTS trigger_notify_new_ticket ON support_tickets;

CREATE TRIGGER trigger_notify_new_ticket
AFTER INSERT ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION notify_new_ticket();

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================

-- Comentarios:
-- 1. Las notificaciones existentes seguirán funcionando (backwards compatible)
-- 2. assignment_context puede ser NULL para notificaciones viejas
-- 3. Los índices aseguran performance con miles de tickets
-- 4. Las funciones RPC son SECURITY DEFINER (acceso elevado controlado)
