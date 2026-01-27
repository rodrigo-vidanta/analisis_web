-- ============================================
-- LIMPIEZA DE FUNCIONES OBSOLETAS - FASE 1
-- ============================================
-- Fecha: 27 Enero 2026
-- Autor: Auditoría Automatizada
-- Riesgo: BAJO (funciones no usadas)
-- ============================================

-- PASO 1: ELIMINAR FUNCIONES DE MULTI-COMPANY (9 funciones)
-- Estas funciones NUNCA se usaron - feature no implementado

DROP FUNCTION IF EXISTS create_company_direct(text, text, text, text, text, text, text, text, text, text, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS create_company_v2(jsonb) CASCADE;
DROP FUNCTION IF EXISTS create_company_v3(jsonb) CASCADE;
DROP FUNCTION IF EXISTS get_companies_direct() CASCADE;
DROP FUNCTION IF EXISTS get_companies_json() CASCADE;
DROP FUNCTION IF EXISTS get_companies_via_calls() CASCADE;
DROP FUNCTION IF EXISTS get_company_modules(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_companies(uuid) CASCADE;
DROP FUNCTION IF EXISTS search_companies(text) CASCADE;

-- Verificación (debe retornar 0)
SELECT COUNT(*) as funciones_company_restantes
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND (p.proname LIKE '%company%' OR p.proname LIKE '%companies%');

-- PASO 2: ELIMINAR FUNCIONES DE MIGRACIÓN (2 funciones)
-- Migración a Supabase Auth fue CANCELADA

DROP FUNCTION IF EXISTS migrate_user_to_supabase_auth(text, text, jsonb, uuid) CASCADE;
DROP FUNCTION IF EXISTS migrate_all_users_to_supabase_auth() CASCADE;

-- Verificación (debe retornar 0)
SELECT COUNT(*) as funciones_migracion_restantes
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname LIKE '%migrate%auth%';

-- PASO 3: ELIMINAR FUNCIONES AUXILIARES DE AUDITORÍA (opcionales)
-- Estas fueron creadas solo para la auditoría de hoy

-- Descomentar si quieres eliminarlas:
-- DROP FUNCTION IF EXISTS audit_obsolete_functions() CASCADE;
-- DROP FUNCTION IF EXISTS get_function_source(text) CASCADE;
-- DROP FUNCTION IF EXISTS list_all_functions() CASCADE;

-- ============================================
-- RESUMEN
-- ============================================
-- Total funciones eliminadas: 11
-- - Multi-company: 9
-- - Migración: 2
-- ============================================

-- Verificación final
SELECT 
  'Limpieza completada' as status,
  COUNT(*) as total_funciones_actuales
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
  AND l.lanname = 'plpgsql';
