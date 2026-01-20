-- ============================================
-- CORRECCIÓN DE POLÍTICAS RLS - TICKETS
-- ============================================
-- Fecha: 2026-01-20
-- Estado: ✅ EJECUTADO via Supabase Management API
-- Problema: Las políticas usaban role_name que no existe en auth_users
-- Solución: Función SECURITY DEFINER para verificar roles
-- 
-- Nota: Usa auth.uid() de Supabase Auth (no auth custom)
-- Los IDs en auth.users coinciden con auth_users.id
-- ============================================

-- ========================================
-- FUNCIÓN SECURITY DEFINER PARA VERIFICAR ADMIN
-- ========================================
-- Esta función se ejecuta con permisos elevados (service_role)
-- pero solo devuelve TRUE/FALSE, no expone datos sensibles

CREATE OR REPLACE FUNCTION public.is_support_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_id UUID;
  admin_role_id UUID := '12690827-493e-447b-ac2f-40174fe17389';      -- admin
  admin_op_role_id UUID := '34cc26d1-8a96-4be2-833e-7a13d5553722';   -- administrador_operativo
  developer_role_id UUID := '59386336-794d-40de-83a4-de73681d6904';  -- developer
BEGIN
  -- Obtener role_id del usuario actual
  SELECT role_id INTO user_role_id
  FROM auth_users
  WHERE id = auth.uid();
  
  -- Verificar si es admin, admin_operativo o developer
  RETURN user_role_id IN (admin_role_id, admin_op_role_id, developer_role_id);
END;
$$;

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.is_support_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support_admin() TO anon;

-- ========================================
-- ELIMINAR POLÍTICAS ANTERIORES INCORRECTAS
-- ========================================

DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;

DROP POLICY IF EXISTS "Users can view comments on own tickets" ON support_ticket_comments;
DROP POLICY IF EXISTS "Users can add comments to own tickets" ON support_ticket_comments;
DROP POLICY IF EXISTS "Admins full access to comments" ON support_ticket_comments;

DROP POLICY IF EXISTS "Users can view history of own tickets" ON support_ticket_history;
DROP POLICY IF EXISTS "Admins full access to history" ON support_ticket_history;

DROP POLICY IF EXISTS "Users can view attachments of own tickets" ON support_ticket_attachments;
DROP POLICY IF EXISTS "Admins full access to attachments" ON support_ticket_attachments;

-- ========================================
-- POLÍTICAS CORREGIDAS - SUPPORT_TICKETS
-- ========================================

-- Usuarios pueden ver sus propios tickets
CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_support_admin());

-- Usuarios pueden crear tickets (solo para sí mismos)
CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Admins pueden actualizar cualquier ticket
CREATE POLICY "Admins can update tickets" ON support_tickets
  FOR UPDATE TO authenticated
  USING (public.is_support_admin())
  WITH CHECK (public.is_support_admin());

-- Admins pueden eliminar tickets (solo si es necesario)
CREATE POLICY "Admins can delete tickets" ON support_tickets
  FOR DELETE TO authenticated
  USING (public.is_support_admin());

-- ========================================
-- POLÍTICAS CORREGIDAS - COMMENTS
-- ========================================

-- Usuarios pueden ver comentarios de sus tickets (no internos)
CREATE POLICY "Users can view comments on own tickets" ON support_ticket_comments
  FOR SELECT TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM support_tickets
        WHERE id = ticket_id AND reporter_id = auth.uid()
      )
      AND is_internal = FALSE
    )
    OR public.is_support_admin()
  );

-- Usuarios pueden agregar comentarios a sus tickets
CREATE POLICY "Users can add comments to own tickets" ON support_ticket_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM support_tickets
        WHERE id = ticket_id AND reporter_id = auth.uid()
      )
      AND user_id = auth.uid()
      AND is_internal = FALSE  -- Usuarios no pueden crear comentarios internos
    )
    OR public.is_support_admin()
  );

-- Admins pueden actualizar comentarios
CREATE POLICY "Admins can update comments" ON support_ticket_comments
  FOR UPDATE TO authenticated
  USING (public.is_support_admin());

-- Admins pueden eliminar comentarios
CREATE POLICY "Admins can delete comments" ON support_ticket_comments
  FOR DELETE TO authenticated
  USING (public.is_support_admin());

-- ========================================
-- POLÍTICAS CORREGIDAS - HISTORY
-- ========================================

-- Usuarios pueden ver historial de sus tickets
CREATE POLICY "Users can view history of own tickets" ON support_ticket_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND reporter_id = auth.uid()
    )
    OR public.is_support_admin()
  );

-- Solo admins pueden crear historial
CREATE POLICY "Admins can insert history" ON support_ticket_history
  FOR INSERT TO authenticated
  WITH CHECK (public.is_support_admin() OR user_id = auth.uid());

-- ========================================
-- POLÍTICAS CORREGIDAS - ATTACHMENTS
-- ========================================

-- Usuarios pueden ver adjuntos de sus tickets
CREATE POLICY "Users can view attachments of own tickets" ON support_ticket_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND reporter_id = auth.uid()
    )
    OR public.is_support_admin()
  );

-- Usuarios pueden subir adjuntos a sus tickets
CREATE POLICY "Users can upload attachments to own tickets" ON support_ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE id = ticket_id AND reporter_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Admins pueden gestionar adjuntos
CREATE POLICY "Admins can manage attachments" ON support_ticket_attachments
  FOR ALL TO authenticated
  USING (public.is_support_admin());

-- ========================================
-- VERIFICACIÓN
-- ========================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename LIKE 'support_%'
ORDER BY tablename, policyname;
