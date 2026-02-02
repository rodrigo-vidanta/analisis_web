-- ============================================
-- DEBUG: Support Ticket Comments RLS
-- ============================================
-- Investigar por qué INSERT + SELECT sigue fallando con 404

-- ============================================
-- PASO 1: Verificar que la tabla existe y RLS está habilitado
-- ============================================
SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'support_ticket_comments';
-- Esperado: 1 fila con rls_enabled = true

-- ============================================
-- PASO 2: Ver políticas actuales completas
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'support_ticket_comments'
ORDER BY cmd, policyname;

-- ============================================
-- PASO 3: Verificar ticket específico
-- ============================================
-- Reemplazar con el UUID real del ticket TKT-20260131-0065
SELECT 
  id,
  ticket_number,
  reporter_id,
  reporter_name,
  reporter_email,
  status,
  created_at
FROM support_tickets
WHERE ticket_number = 'TKT-20260131-0065';

-- ============================================
-- PASO 4: Verificar permisos del usuario actual
-- ============================================
-- Esta query debe ejecutarse como el usuario autenticado
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- ============================================
-- PASO 5: Simular INSERT como usuario autenticado
-- ============================================
-- IMPORTANTE: Ejecutar esto DESPUÉS de obtener el ticket_id del PASO 3

-- Ejemplo (reemplazar UUIDs reales):
/*
SET LOCAL request.jwt.claims TO '{"sub": "USER_UUID_AQUI", "role": "authenticated"}';

INSERT INTO support_ticket_comments (
  ticket_id, 
  user_id, 
  user_name, 
  user_role, 
  content, 
  is_internal
) VALUES (
  'TICKET_UUID_AQUI',
  'USER_UUID_AQUI',
  'Test User',
  'ejecutivo',
  'Test comment from DEBUG',
  FALSE
) RETURNING *;
*/

-- ============================================
-- PASO 6: Verificar si el problema es el SELECT post-INSERT
-- ============================================
-- Probar SELECT manual del comentario recién insertado
-- SELECT * FROM support_ticket_comments 
-- WHERE ticket_id = 'TICKET_UUID_AQUI'
-- ORDER BY created_at DESC LIMIT 1;

-- ============================================
-- PASO 7: Verificar dependencias (support_tickets y user_profiles_v2)
-- ============================================

-- ¿La tabla support_tickets existe y tiene datos?
SELECT COUNT(*) as total_tickets FROM support_tickets;

-- ¿La vista user_profiles_v2 está accesible?
SELECT COUNT(*) as total_users FROM user_profiles_v2;

-- ============================================
-- PASO 8: Política de INSERT más permisiva (TEST)
-- ============================================
-- Si todo lo anterior falla, prueba una política más simple:

/*
DROP POLICY IF EXISTS "RLS: users can add comments to own tickets" ON public.support_ticket_comments;

CREATE POLICY "RLS: users can add comments - TEST"
ON public.support_ticket_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_internal = FALSE
);
*/

-- ============================================
-- PASO 9: Política de SELECT más permisiva (TEST)
-- ============================================
/*
DROP POLICY IF EXISTS "RLS: users can read own ticket comments" ON public.support_ticket_comments;

CREATE POLICY "RLS: users can read comments - TEST"
ON public.support_ticket_comments FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'developer')
  )
);
*/

-- ============================================
-- PASO 10: Verificar grants de la tabla
-- ============================================
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'support_ticket_comments'
AND table_schema = 'public';
-- Esperado: authenticated debe tener SELECT, INSERT, UPDATE, DELETE

-- ============================================
-- NOTAS DE DEBUG
-- ============================================
-- 1. Si PASO 1-2 fallan → problema de estructura
-- 2. Si PASO 3 no retorna datos → ticket no existe
-- 3. Si PASO 4 retorna NULL → usuario no autenticado
-- 4. Si PASO 5 falla con INSERT → problema en WITH CHECK
-- 5. Si PASO 5 INSERT OK pero SELECT falla → problema en USING
-- 6. Si PASO 7 falla → vistas/tablas relacionadas inaccesibles
-- 7. Si PASO 10 no muestra grants → problema de permisos base
