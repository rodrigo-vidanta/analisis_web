-- ============================================
-- FUNCIÓN SEGURA PARA EJECUTAR SQL COMPLETO
-- ============================================
-- SOLO ejecutable con service_role_key
-- NO expuesta a anon ni authenticated
-- Para uso EXCLUSIVO del MCP local

-- 1. Crear función que ejecuta SQL y retorna resultado
CREATE OR REPLACE FUNCTION exec_ddl(sql_command TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql_command;
  RETURN 'OK';
EXCEPTION WHEN OTHERS THEN
  RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- 2. CRÍTICO: Revocar TODO acceso público
REVOKE ALL ON FUNCTION exec_ddl(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION exec_ddl(TEXT) FROM anon;
REVOKE ALL ON FUNCTION exec_ddl(TEXT) FROM authenticated;

-- 3. SOLO permitir a service_role
GRANT EXECUTE ON FUNCTION exec_ddl(TEXT) TO service_role;

-- 4. Comentario de documentación
COMMENT ON FUNCTION exec_ddl IS 
'Ejecuta SQL arbitrario (DDL/DML). SOLO accesible con service_role_key. Para uso del MCP local.';

-- 5. Verificar permisos (debe mostrar solo service_role)
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'exec_ddl';
