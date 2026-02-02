-- Test específico para Samuel Rosales comentando ticket de Kenia
-- Samuel ID: e8ced62c-3fd0-4328-b61a-a59ebea2e877 (admin)
-- Ticket: TKT-20260131-0065 (reporter: Kenia)

-- Simular sesión de Samuel
SET LOCAL request.jwt.claims TO '{"sub": "e8ced62c-3fd0-4328-b61a-a59ebea2e877", "role": "authenticated"}';

-- Test 1: ¿Samuel aparece en user_profiles_v2 como admin?
SELECT id, email, role_name 
FROM user_profiles_v2 
WHERE id = 'e8ced62c-3fd0-4328-b61a-a59ebea2e877';
-- Esperado: 1 fila con role_name = 'admin'

-- Test 2: ¿La política de admin se evalúa correctamente?
SELECT EXISTS (
  SELECT 1 FROM public.user_profiles_v2
  WHERE id = 'e8ced62c-3fd0-4328-b61a-a59ebea2e877'::uuid
  AND role_name IN ('admin', 'administrador_operativo', 'developer')
) as es_admin;
-- Esperado: TRUE

-- Test 3: Intentar INSERT como Samuel (admin)
INSERT INTO support_ticket_comments (
  ticket_id, 
  user_id, 
  user_name, 
  user_role, 
  content, 
  is_internal
) VALUES (
  '101da1ce-36ba-4af1-91ea-41f5f6a43df6',  -- Ticket de Kenia
  'e8ced62c-3fd0-4328-b61a-a59ebea2e877',  -- Samuel (admin)
  'Samuel Rosales',
  'admin',
  'Test desde SQL - Samuel como admin',
  FALSE
) RETURNING *;

-- Si falla aquí, hay un problema con la política "admins_manage_comments"

RESET ROLE;
