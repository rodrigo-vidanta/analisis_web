-- ============================================
-- AUDITORÍA CORREGIDA: Funciones con Referencias Obsoletas
-- ============================================
-- Contexto: La app YA MIGRÓ a auth.users (nativo)
-- Obsoleto: public.auth_users, public.auth_users_compat
-- Correcto: auth.users + user_profiles_v2
-- ============================================

CREATE OR REPLACE FUNCTION audit_obsolete_auth_references()
RETURNS TABLE (
  function_name TEXT,
  issue_type TEXT,
  obsolete_reference TEXT,
  should_use TEXT,
  priority TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH function_sources AS (
    SELECT 
      p.proname::TEXT as fname,
      pg_get_functiondef(p.oid)::TEXT as source
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_language l ON p.prolang = l.oid
    WHERE n.nspname = 'public'
      AND l.lanname = 'plpgsql'
      AND p.prokind IN ('f', 'p')
  )
  SELECT 
    fname as function_name,
    CASE
      WHEN source LIKE '%public.auth_users%' AND source NOT LIKE '%auth_users_compat%' THEN 'tabla_custom_obsoleta'
      WHEN source LIKE '%auth_users_compat%' THEN 'vista_compatibilidad_legacy'
      WHEN source LIKE '%z_legacy_auth_users%' THEN 'tabla_legacy_renombrada'
      WHEN source LIKE '%FROM auth_users%' OR source LIKE '%JOIN auth_users%' THEN 'referencia_tabla_vieja'
      WHEN source LIKE '%system_ui%' OR source LIKE '%zbylezfyagwrxoecioup%' THEN 'proyecto_obsoleto'
      ELSE 'otro'
    END as issue_type,
    CASE
      WHEN source LIKE '%public.auth_users%' THEN 'public.auth_users'
      WHEN source LIKE '%auth_users_compat%' THEN 'auth_users_compat'
      WHEN source LIKE '%z_legacy_auth_users%' THEN 'z_legacy_auth_users'
      WHEN source LIKE '%FROM auth_users%' THEN 'FROM auth_users'
      WHEN source LIKE '%system_ui%' THEN 'system_ui'
      ELSE 'N/A'
    END as obsolete_reference,
    CASE
      WHEN source LIKE '%auth_users%' THEN 'auth.users o user_profiles_v2'
      WHEN source LIKE '%system_ui%' THEN 'PQNC_AI (proyecto unificado)'
      ELSE 'N/A'
    END as should_use,
    CASE
      WHEN source LIKE '%z_legacy_auth_users%' THEN '🔴 CRÍTICO'
      WHEN source LIKE '%public.auth_users%' AND source NOT LIKE '%compat%' THEN '🔴 ALTA'
      WHEN source LIKE '%auth_users_compat%' THEN '🟡 MEDIA'
      WHEN source LIKE '%system_ui%' THEN '🔴 ALTA'
      ELSE '🟢 BAJA'
    END as priority
  FROM function_sources
  WHERE 
    source LIKE '%auth_users%'
    OR source LIKE '%z_legacy_auth_users%'
    OR source LIKE '%system_ui%'
    OR source LIKE '%zbylezfyagwrxoecioup%'
  ORDER BY 
    CASE 
      WHEN source LIKE '%z_legacy_auth_users%' THEN 1
      WHEN source LIKE '%public.auth_users%' AND source NOT LIKE '%compat%' THEN 2
      WHEN source LIKE '%system_ui%' THEN 3
      WHEN source LIKE '%auth_users_compat%' THEN 4
      ELSE 5
    END,
    fname;
END;
$$;