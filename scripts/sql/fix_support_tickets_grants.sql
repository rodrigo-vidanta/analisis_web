-- ============================================
-- FIX: Grants en Support Ticket Tables
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Problema: 404 en POST sugiere falta de grants para rol authenticated
-- Las políticas RLS están bien, pero sin grants no funcionan

-- ============================================
-- PASO 1: Verificar grants actuales
-- ============================================

-- Ver grants en las tablas de support
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== GRANTS ACTUALES ===';
  FOR r IN 
    SELECT 
      table_name,
      grantee,
      string_agg(privilege_type, ', ') as privileges
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
    AND table_name LIKE 'support_ticket%'
    AND grantee IN ('authenticated', 'anon', 'service_role')
    GROUP BY table_name, grantee
    ORDER BY table_name, grantee
  LOOP
    RAISE NOTICE '% - % : %', r.table_name, r.grantee, r.privileges;
  END LOOP;
END $$;

-- ============================================
-- PASO 2: Otorgar grants necesarios
-- ============================================

-- SUPPORT_TICKETS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT ON public.support_tickets TO anon;

-- SUPPORT_TICKET_COMMENTS (crítico)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_comments TO authenticated;
GRANT SELECT ON public.support_ticket_comments TO anon;

-- SUPPORT_TICKET_HISTORY
GRANT SELECT, INSERT ON public.support_ticket_history TO authenticated;
GRANT SELECT ON public.support_ticket_history TO anon;

-- SUPPORT_TICKET_ATTACHMENTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_attachments TO authenticated;
GRANT SELECT ON public.support_ticket_attachments TO anon;

-- SUPPORT_TICKET_NOTIFICATIONS (si existe)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_notifications TO authenticated;
GRANT SELECT ON public.support_ticket_notifications TO anon;

-- ============================================
-- PASO 3: Verificar grants después de aplicar
-- ============================================

SELECT 
  table_name,
  grantee,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name LIKE 'support_ticket%'
AND grantee IN ('authenticated', 'anon', 'service_role')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- Resultado esperado para support_ticket_comments:
-- authenticated: DELETE, INSERT, SELECT, UPDATE
-- anon: SELECT
-- service_role: (todos los permisos)

-- ============================================
-- PASO 4: Test de acceso con rol authenticated
-- ============================================

-- Simular como authenticated (sin SET ROLE, solo para verificar estructura)
-- Este SELECT debe funcionar con las políticas RLS:
/*
SELECT COUNT(*) FROM support_ticket_comments;
-- Debe retornar 0 si no hay datos, no debe dar error
*/

-- ============================================
-- EXPLICACIÓN
-- ============================================

/*
El error 404 en POST con anon_key ocurre cuando:

1. La tabla existe ✅ (verificado)
2. Las políticas RLS existen ✅ (verificado)
3. PERO: El rol 'authenticated' NO TIENE GRANTS en la tabla ❌

Supabase requiere:
- GRANTS a nivel de tabla (GRANT SELECT, INSERT...)
- Políticas RLS (CREATE POLICY...)

Sin grants, aunque las políticas RLS estén correctas, 
el usuario autenticado no puede ni siquiera intentar el INSERT.

Resultado: HTTP 404 (tabla no accesible para ese rol)
*/
