-- ============================================
-- SISTEMA DE NOTIFICACIONES EN TIEMPO REAL
-- ============================================
-- Fecha: 2026-01-20
-- Estado: ✅ EJECUTADO via Supabase Management API
-- 
-- Funcionalidades:
--   - Notificaciones automáticas cuando se crea un ticket (a admins)
--   - Notificaciones de cambio de status (al reporter)
--   - Notificaciones de nuevos comentarios (bidireccional)
--   - Suscripción en tiempo real via Supabase Realtime
-- ============================================

-- ========================================
-- HABILITAR REALTIME EN TABLAS
-- ========================================
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE support_ticket_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE support_ticket_notifications;

-- ========================================
-- TABLA DE NOTIFICACIONES
-- ========================================
CREATE TABLE IF NOT EXISTS support_ticket_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('new_ticket', 'status_change', 'new_comment', 'assigned')),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON support_ticket_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_ticket ON support_ticket_notifications(ticket_id);

-- ========================================
-- RLS PARA NOTIFICACIONES
-- ========================================
ALTER TABLE support_ticket_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON support_ticket_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON support_ticket_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON support_ticket_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ========================================
-- FUNCIÓN PARA OBTENER IDs DE ADMINS
-- ========================================
CREATE OR REPLACE FUNCTION get_support_admin_ids()
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT id FROM auth_users 
  WHERE role_id IN (
    '12690827-493e-447b-ac2f-40174fe17389',  -- admin
    '34cc26d1-8a96-4be2-833e-7a13d5553722',  -- administrador_operativo
    '59386336-794d-40de-83a4-de73681d6904'   -- developer
  ) AND is_active = true;
END;
$$;

-- ========================================
-- TRIGGER: NOTIFICAR NUEVO TICKET
-- ========================================
CREATE OR REPLACE FUNCTION notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id UUID;
BEGIN
  -- Notificar a todos los admins
  FOR admin_id IN SELECT * FROM get_support_admin_ids() LOOP
    INSERT INTO support_ticket_notifications (user_id, ticket_id, type, message)
    VALUES (admin_id, NEW.id, 'new_ticket', 'Nuevo ticket: ' || NEW.ticket_number || ' - ' || NEW.title);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_ticket ON support_tickets;
CREATE TRIGGER trigger_notify_new_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_ticket();

-- ========================================
-- TRIGGER: NOTIFICAR CAMBIO DE STATUS
-- ========================================
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo notificar si el status cambió
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO support_ticket_notifications (user_id, ticket_id, type, message)
    VALUES (NEW.reporter_id, NEW.id, 'status_change', 'Tu ticket ' || NEW.ticket_number || ' cambió a: ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_status_change ON support_tickets;
CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_status_change();

-- ========================================
-- TRIGGER: NOTIFICAR NUEVO COMENTARIO
-- ========================================
CREATE OR REPLACE FUNCTION notify_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ticket_reporter_id UUID;
  ticket_number VARCHAR(20);
  admin_id UUID;
  commenter_is_admin BOOLEAN;
BEGIN
  -- Obtener datos del ticket
  SELECT reporter_id, support_tickets.ticket_number 
  INTO ticket_reporter_id, ticket_number 
  FROM support_tickets 
  WHERE id = NEW.ticket_id;
  
  -- Verificar si el que comenta es admin
  SELECT public.is_support_admin() INTO commenter_is_admin;
  
  IF commenter_is_admin AND NEW.is_internal = FALSE THEN
    -- Admin respondió al usuario (no es comentario interno)
    INSERT INTO support_ticket_notifications (user_id, ticket_id, type, message)
    VALUES (ticket_reporter_id, NEW.ticket_id, 'new_comment', 'Nueva respuesta en tu ticket ' || ticket_number);
  ELSIF NOT commenter_is_admin THEN
    -- Usuario respondió, notificar a todos los admins
    FOR admin_id IN SELECT * FROM get_support_admin_ids() LOOP
      INSERT INTO support_ticket_notifications (user_id, ticket_id, type, message)
      VALUES (admin_id, NEW.ticket_id, 'new_comment', 'Nuevo comentario del usuario en ' || ticket_number);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_comment ON support_ticket_comments;
CREATE TRIGGER trigger_notify_new_comment
  AFTER INSERT ON support_ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_comment();

-- ========================================
-- VERIFICACIÓN
-- ========================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'trigger_notify%';
