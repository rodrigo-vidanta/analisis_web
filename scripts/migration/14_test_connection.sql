-- ============================================
-- SCRIPT DE PRUEBA DE CONEXIÓN
-- ============================================
-- 
-- Ejecuta este script DESPUÉS de ejecutar 12_setup_database_connection.sql
-- para verificar que la conexión funciona correctamente
--
-- ============================================

-- 1. Verificar que el servidor externo existe
SELECT 
    srvname as server_name,
    srvoptions as server_options
FROM pg_foreign_server 
WHERE srvname = 'system_ui_server';

-- 2. Verificar que el usuario mapping existe
SELECT 
    um.srvname as server_name,
    um.umuser as user_oid,
    um.umoptions as mapping_options
FROM pg_user_mapping um
JOIN pg_foreign_server fs ON um.srvname = fs.srvname
WHERE fs.srvname = 'system_ui_server';

-- 3. Probar conexión básica
SELECT * FROM dblink('system_ui_server', 
    'SELECT current_database() as db_name, current_user as user_name, version() as pg_version'
) AS t(db_name text, user_name text, pg_version text);

-- 4. Probar consulta a una tabla pequeña
SELECT COUNT(*) as total_registros
FROM dblink('system_ui_server',
    'SELECT COUNT(*) FROM admin_messages'
) AS t(count bigint);

-- 5. Probar obtener algunos registros de prueba
SELECT * FROM dblink('system_ui_server',
    'SELECT id, message, created_at FROM admin_messages LIMIT 3'
) AS t(
    id uuid,
    message text,
    created_at timestamptz
);

-- Si todas las consultas funcionan, la conexión está lista para migrar datos ✅
