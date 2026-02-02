-- ============================================
-- VERIFICACIÓN COMPLETA: Support Ticket Comments
-- ============================================
-- Ejecutar en Supabase SQL Editor para diagnosticar problema 404

-- ============================================
-- TEST 1: ¿La tabla existe?
-- ============================================
SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'support_ticket_comments';

-- Esperado: 1 fila
-- Si retorna 0 filas → LA TABLA NO EXISTE (problema crítico)

-- ============================================
-- TEST 2: ¿Qué columnas tiene?
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'support_ticket_comments'
ORDER BY ordinal_position;

-- Esperado: ~9 columnas (id, ticket_id, user_id, user_name, user_role, content, is_internal, created_at, updated_at)

-- ============================================
-- TEST 3: ¿Grants están correctos?
-- ============================================
SELECT 
  grantee,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'support_ticket_comments'
AND grantee IN ('authenticated', 'anon', 'service_role')
GROUP BY grantee
ORDER BY grantee;

-- Esperado:
-- anon: SELECT
-- authenticated: DELETE, INSERT, SELECT, UPDATE
-- service_role: (todos)

-- ============================================
-- TEST 4: ¿Políticas RLS están correctas?
-- ============================================
SELECT 
  policyname,
  cmd,
  qual as using_check,
  with_check
FROM pg_policies
WHERE tablename = 'support_ticket_comments'
ORDER BY cmd, policyname;

-- Esperado: 3 políticas
-- - RLS: admins full access comments (ALL)
-- - RLS: users add comments (INSERT)
-- - RLS: users read own ticket comments (SELECT)

-- ============================================
-- TEST 5: ¿La tabla está en el schema correcto?
-- ============================================
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_name LIKE 'support_ticket%'
ORDER BY table_name;

-- Esperado: Todas las tablas en schema 'public'

-- ============================================
-- TEST 6: INSERT directo con service_role
-- ============================================
-- Este test se ejecuta con service_role (sin RLS)
-- Si falla → problema de estructura de tabla

INSERT INTO public.support_ticket_comments (
  ticket_id,
  user_id,
  user_name,
  user_role,
  content,
  is_internal
) VALUES (
  '101da1ce-36ba-4af1-91ea-41f5f6a43df6',  -- Ticket real: TKT-20260131-0065
  '2e3b74b9-1377-4f7d-8ed2-400f54b1869a',  -- Usuario real: Kenia
  'Test desde SQL Editor',
  'ejecutivo',
  'Test comment directo - verificando estructura tabla',
  FALSE
) RETURNING *;

-- Si falla con "column does not exist" → tabla tiene estructura diferente
-- Si funciona → problema es de RLS o grants

-- ============================================
-- TEST 7: SELECT como authenticated (simulado)
-- ============================================
-- Verificar política RLS de lectura
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "2e3b74b9-1377-4f7d-8ed2-400f54b1869a", "role": "authenticated"}';

SELECT * FROM support_ticket_comments
WHERE ticket_id = '101da1ce-36ba-4af1-91ea-41f5f6a43df6'
LIMIT 5;

-- Si falla con "permission denied" → problema de grants o RLS SELECT
-- Si funciona → el problema está solo en INSERT

RESET ROLE;

-- ============================================
-- TEST 8: Comparar con tabla que funciona
-- ============================================
-- Prospectos funciona bien, comparar estructura de permisos

SELECT 'prospectos' as tabla, grantee, privilege_type 
FROM information_schema.role_table_grants
WHERE table_name = 'prospectos' AND grantee = 'authenticated'

UNION ALL

SELECT 'support_ticket_comments' as tabla, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'support_ticket_comments' AND grantee = 'authenticated'

ORDER BY tabla, privilege_type;

-- Si support_ticket_comments tiene MENOS grants que prospectos → falta aplicar grants

-- ============================================
-- INTERPRETACIÓN DE RESULTADOS
-- ============================================

/*
TEST 1 falla (0 filas):
  → La tabla NO EXISTE en la base de datos
  → Solución: Ejecutar migrations/20260120_support_tickets_system.sql

TEST 2 falla (columnas diferentes):
  → La tabla existe pero con estructura incorrecta
  → Solución: DROP TABLE y re-ejecutar migración

TEST 3 muestra grants faltantes:
  → Ejecutar fix_support_tickets_grants.sql

TEST 4 muestra políticas incorrectas:
  → Ejecutar fix_support_tickets_rls_FINAL.sql

TEST 5 muestra tabla en schema incorrecto:
  → Mover tabla de otro schema a public

TEST 6 falla:
  → Problema de estructura (columnas faltantes o tipos incorrectos)

TEST 7 falla después de TEST 6 exitoso:
  → Problema de políticas RLS

TEST 8 muestra diferencias:
  → support_ticket_comments necesita mismos grants que prospectos
*/
