-- ============================================
-- FIX DEFINITIVO: Forzar eliminación y recreación de políticas
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Problema confirmado: Políticas aún usan auth_users
-- Error: relation "auth_users" does not exist (código 42P01)

-- ============================================
-- PASO 1: Eliminar TODAS las políticas existentes (FORCE)
-- ============================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Eliminar todas las políticas de support_ticket_comments
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'support_ticket_comments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_ticket_comments', r.policyname);
    RAISE NOTICE 'Eliminada política: %', r.policyname;
  END LOOP;
  
  -- Eliminar todas las políticas de support_tickets
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'support_tickets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_tickets', r.policyname);
    RAISE NOTICE 'Eliminada política: %', r.policyname;
  END LOOP;
  
  -- Eliminar todas las políticas de support_ticket_history
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'support_ticket_history'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_ticket_history', r.policyname);
    RAISE NOTICE 'Eliminada política: %', r.policyname;
  END LOOP;
  
  -- Eliminar todas las políticas de support_ticket_attachments
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'support_ticket_attachments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_ticket_attachments', r.policyname);
    RAISE NOTICE 'Eliminada política: %', r.policyname;
  END LOOP;
END $$;

-- ============================================
-- PASO 2: CREAR POLÍTICAS CORRECTAS (user_profiles_v2)
-- ============================================

-- ============================================
-- SUPPORT_TICKETS
-- ============================================

CREATE POLICY "users_view_own_tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

CREATE POLICY "users_create_tickets"
ON public.support_tickets FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "admins_manage_tickets"
ON public.support_tickets FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- ============================================
-- SUPPORT_TICKET_COMMENTS (CRÍTICO)
-- ============================================

CREATE POLICY "users_read_comments"
ON public.support_ticket_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_comments.ticket_id
    AND reporter_id = auth.uid()
  )
  AND is_internal = FALSE
);

CREATE POLICY "users_add_comments"
ON public.support_ticket_comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_comments.ticket_id
    AND reporter_id = auth.uid()
  )
  AND user_id = auth.uid()
  AND is_internal = FALSE
);

CREATE POLICY "admins_manage_comments"
ON public.support_ticket_comments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- ============================================
-- SUPPORT_TICKET_HISTORY
-- ============================================

CREATE POLICY "users_view_history"
ON public.support_ticket_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_history.ticket_id
    AND reporter_id = auth.uid()
  )
);

CREATE POLICY "admins_manage_history"
ON public.support_ticket_history FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- ============================================
-- SUPPORT_TICKET_ATTACHMENTS
-- ============================================

CREATE POLICY "users_view_attachments"
ON public.support_ticket_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_attachments.ticket_id
    AND reporter_id = auth.uid()
  )
);

CREATE POLICY "users_upload_attachments"
ON public.support_ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_attachments.ticket_id
    AND reporter_id = auth.uid()
  )
  AND uploaded_by = auth.uid()
);

CREATE POLICY "admins_manage_attachments"
ON public.support_ticket_attachments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- ============================================
-- PASO 3: Verificar políticas nuevas
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%auth_users%' THEN '❌ TODAVÍA USA auth_users'
    WHEN with_check::text LIKE '%auth_users%' THEN '❌ TODAVÍA USA auth_users'
    ELSE '✅ OK - usa user_profiles_v2 o sin deps'
  END as validation
FROM pg_policies
WHERE tablename IN ('support_tickets', 'support_ticket_comments', 'support_ticket_history', 'support_ticket_attachments')
ORDER BY tablename, cmd, policyname;

-- Resultado esperado: TODAS las políticas con ✅ OK

-- ============================================
-- PASO 4: Re-aplicar grants por si acaso
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_comments TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_attachments TO authenticated;

-- ============================================
-- PASO 5: Test final
-- ============================================

-- Este comentario ahora debería funcionar
-- Ejecutar en frontend después de aplicar este script
