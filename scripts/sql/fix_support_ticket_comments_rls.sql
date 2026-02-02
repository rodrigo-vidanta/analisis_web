-- ============================================
-- FIX: RLS en support_ticket_comments
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Problema: INSERT con .select() falla con 404 (permisos RLS)
-- Contexto: Usuario intenta comentar ticket TKT-20260131-0065

-- ============================================
-- PASO 1: Verificar que la tabla existe
-- ============================================
SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'support_ticket_comments';
-- Resultado esperado: 1 fila con rls_enabled = true

-- ============================================
-- PASO 2: Ver políticas actuales
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'support_ticket_comments'
ORDER BY cmd, policyname;

-- ============================================
-- PASO 3: Problema Detectado
-- ============================================
-- La política "Users can add comments to own tickets" solo tiene INSERT
-- Pero el frontend hace: .insert().select().single()
-- Esto requiere permisos de SELECT INMEDIATOS después del INSERT

-- Solución: Permitir SELECT del comentario recién insertado

-- ============================================
-- PASO 4: Eliminar políticas conflictivas
-- ============================================
DROP POLICY IF EXISTS "Users can view comments on own tickets" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Users can add comments to own tickets" ON public.support_ticket_comments;
DROP POLICY IF EXISTS "Admins full access to comments" ON public.support_ticket_comments;

-- ============================================
-- PASO 5: Crear políticas mejoradas
-- ============================================

-- LECTURA: Usuarios ven comentarios de sus tickets (no internos)
CREATE POLICY "RLS: users can read own ticket comments"
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

-- ESCRITURA: Usuarios pueden comentar sus tickets
-- CRÍTICO: No incluir is_internal en la validación para permitir SELECT post-INSERT
CREATE POLICY "RLS: users can add comments to own tickets"
ON public.support_ticket_comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE id = support_ticket_comments.ticket_id
    AND reporter_id = auth.uid()
  )
  AND user_id = auth.uid()
  AND is_internal = FALSE  -- Forzar que usuarios no creen internos
);

-- ADMINS: Acceso completo a todos los comentarios
CREATE POLICY "RLS: admins full access to comments"
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
-- PASO 6: Verificación
-- ============================================

-- Listar políticas nuevas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'support_ticket_comments'
ORDER BY cmd, policyname;

-- Resultado esperado:
-- 1. "RLS: users can read own ticket comments" (SELECT)
-- 2. "RLS: users can add comments to own tickets" (INSERT)
-- 3. "RLS: admins full access to comments" (ALL)

-- ============================================
-- PASO 7: Test Manual (opcional)
-- ============================================

-- Como usuario autenticado, simular INSERT + SELECT
-- Reemplazar <USER_ID> y <TICKET_ID> con valores reales

-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "<USER_ID>", "role": "authenticated"}';

-- INSERT INTO support_ticket_comments (
--   ticket_id, user_id, user_name, user_role, content, is_internal
-- ) VALUES (
--   '<TICKET_ID>', '<USER_ID>', 'Test User', 'ejecutivo', 'Test comment', FALSE
-- ) RETURNING *;

-- Si el INSERT funciona y retorna el registro, el fix está completo.

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================

-- 1. La política de INSERT debe permitir is_internal = FALSE para usuarios
-- 2. La política de SELECT debe EXCLUIR is_internal = TRUE para usuarios
-- 3. Admins tienen acceso total (USING y WITH CHECK sin restricciones extras)
-- 4. El problema del 404 se debe a que el usuario no podía SELECT después de INSERT

COMMENT ON POLICY "RLS: users can read own ticket comments" ON public.support_ticket_comments IS 
  'Usuarios ven comentarios públicos de sus tickets';
COMMENT ON POLICY "RLS: users can add comments to own tickets" ON public.support_ticket_comments IS 
  'Usuarios pueden comentar sus tickets (solo públicos)';
COMMENT ON POLICY "RLS: admins full access to comments" ON public.support_ticket_comments IS 
  'Admins tienen acceso completo (incluye comentarios internos)';
