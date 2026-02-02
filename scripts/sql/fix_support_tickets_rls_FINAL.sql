-- ============================================
-- FIX DEFINITIVO: Support Ticket Comments RLS
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Problema REAL: Políticas usan "auth_users" que NO EXISTE
-- Error: relation "auth_users" does not exist

-- ============================================
-- DIAGNÓSTICO CONFIRMADO
-- ============================================
-- Las políticas antiguas (del 20260120) usan:
--   SELECT 1 FROM auth_users WHERE id = auth.uid()...
-- 
-- Pero auth_users ya NO EXISTE (migración 2025-01-13)
-- Reemplazo correcto: user_profiles_v2

-- ============================================
-- PASO 1: Eliminar TODAS las políticas existentes
-- ============================================
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;

DROP POLICY IF EXISTS "Users can view comments on own tickets" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Users can add comments to own tickets" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Admins full access to comments" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "RLS: users can read own ticket comments" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "RLS: users can add comments to own tickets" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "RLS: admins full access to comments" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Admins can delete comments" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Admins can update comments" ON public.support_ticket_comments;

DROP POLICY IF EXISTS "Users can view history of own tickets" ON public.support_ticket_history;
DROP POLICY IF EXISTS "Admins full access to history" ON public.support_ticket_history;

DROP POLICY IF EXISTS "Users can view attachments of own tickets" ON public.support_ticket_attachments;
DROP POLICY IF EXISTS "Admins full access to attachments" ON public.support_ticket_attachments;

-- ============================================
-- PASO 2: TICKETS - Políticas Corregidas
-- ============================================

-- Usuarios ven sus propios tickets
CREATE POLICY "RLS: users view own tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

-- Usuarios crean tickets
CREATE POLICY "RLS: users create tickets"
ON public.support_tickets FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Admins ven y gestionan todos los tickets
CREATE POLICY "RLS: admins manage all tickets"
ON public.support_tickets FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- ============================================
-- PASO 3: COMMENTS - Políticas Corregidas
-- ============================================

-- LECTURA: Usuarios ven comentarios públicos de sus tickets
CREATE POLICY "RLS: users read own ticket comments"
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

-- ESCRITURA: Usuarios comentan sus tickets
CREATE POLICY "RLS: users add comments"
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

-- ADMINS: Acceso completo a comentarios
CREATE POLICY "RLS: admins full access comments"
ON public.support_ticket_comments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- ============================================
-- PASO 4: HISTORY - Políticas Corregidas
-- ============================================

-- Usuarios ven historial de sus tickets
CREATE POLICY "RLS: users view history"
ON public.support_ticket_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_history.ticket_id
    AND reporter_id = auth.uid()
  )
);

-- Admins gestionan historial
CREATE POLICY "RLS: admins manage history"
ON public.support_ticket_history FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- ============================================
-- PASO 5: ATTACHMENTS - Políticas Corregidas
-- ============================================

-- Usuarios ven adjuntos de sus tickets
CREATE POLICY "RLS: users view attachments"
ON public.support_ticket_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_attachments.ticket_id
    AND reporter_id = auth.uid()
  )
);

-- Usuarios suben adjuntos a sus tickets
CREATE POLICY "RLS: users upload attachments"
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

-- Admins gestionan adjuntos
CREATE POLICY "RLS: admins manage attachments"
ON public.support_ticket_attachments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);

-- ============================================
-- PASO 6: Verificación
-- ============================================

-- Verificar políticas de tickets
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('support_tickets', 'support_ticket_comments', 'support_ticket_history', 'support_ticket_attachments')
ORDER BY tablename, cmd, policyname;

-- Resultado esperado: 13 políticas totales
-- support_tickets: 3 (select, insert, all)
-- support_ticket_comments: 3 (select, insert, all)
-- support_ticket_history: 2 (select, all)
-- support_ticket_attachments: 3 (select, insert, all)

-- ============================================
-- PASO 7: Test de INSERT (Opcional)
-- ============================================
/*
-- Probar como usuario autenticado (Kenia del ticket TKT-20260131-0065)
SET LOCAL request.jwt.claims TO '{"sub": "2e3b74b9-1377-4f7d-8ed2-400f54b1869a", "role": "authenticated"}';

INSERT INTO support_ticket_comments (
  ticket_id, 
  user_id, 
  user_name, 
  user_role, 
  content, 
  is_internal
) VALUES (
  '101da1ce-36ba-4af1-91ea-41f5f6a43df6',
  '2e3b74b9-1377-4f7d-8ed2-400f54b1869a',
  'Martinez Arvizu Kenia Magalli',
  'ejecutivo',
  'Test comment después del fix',
  FALSE
) RETURNING *;
*/

-- ============================================
-- COMENTARIOS FINALES
-- ============================================

COMMENT ON POLICY "RLS: users view own tickets" ON public.support_tickets IS 
  'Usuarios ven solo sus tickets (reporter_id match)';
COMMENT ON POLICY "RLS: users create tickets" ON public.support_tickets IS 
  'Usuarios crean tickets con su reporter_id';
COMMENT ON POLICY "RLS: admins manage all tickets" ON public.support_tickets IS 
  'Admins gestionan todos los tickets (SELECT, INSERT, UPDATE, DELETE)';

COMMENT ON POLICY "RLS: users read own ticket comments" ON public.support_ticket_comments IS 
  'Usuarios leen comentarios públicos de sus tickets';
COMMENT ON POLICY "RLS: users add comments" ON public.support_ticket_comments IS 
  'Usuarios comentan en sus tickets (is_internal forzado a FALSE)';
COMMENT ON POLICY "RLS: admins full access comments" ON public.support_ticket_comments IS 
  'Admins gestionan todos los comentarios (incluye internos)';
