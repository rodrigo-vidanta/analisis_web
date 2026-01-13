-- ============================================
-- CONFIGURACIÓN DE CONEXIÓN ENTRE BASES DE DATOS
-- ============================================
-- 
-- Este script configura postgres_fdw para conectar pqnc_ai con system_ui
-- Permite migrar datos directamente sin exportar/importar manualmente
--
-- REQUISITOS:
-- 1. Ambas bases de datos deben estar en la misma cuenta de Supabase
-- 2. Necesitas las credenciales de conexión directa a PostgreSQL (no API URLs)
-- 3. Las credenciales se obtienen del Dashboard de Supabase > Settings > Database
--
-- CREDENCIALES NECESARIAS:
-- - Host: db.zbylezfyagwrxoecioup.supabase.co (para system_ui)
-- - Port: 5432
-- - Database: postgres
-- - User: postgres
-- - Password: (obtener del dashboard de Supabase)
--
-- ============================================

-- Paso 1: Verificar que postgres_fdw está habilitada
-- NOTA: La extensión debe habilitarse desde el Dashboard de Supabase
-- Settings > Database > Extensions > postgres_fdw > Enable (esquema: public)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgres_fdw')
        THEN 'postgres_fdw está habilitada ✅'
        ELSE 'ERROR: postgres_fdw NO está habilitada. Habilítala desde el Dashboard primero.'
    END as status;

-- Paso 2: Crear servidor externo apuntando a system_ui
-- NOTA: Reemplazar 'system_ui_host', 'system_ui_port', 'system_ui_db' con valores reales
DROP SERVER IF EXISTS system_ui_server CASCADE;

CREATE SERVER system_ui_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'db.zbylezfyagwrxoecioup.supabase.co',  -- Host de system_ui
    port '5432',                                 -- Puerto PostgreSQL
    dbname 'postgres'                            -- Nombre de la base de datos
);

-- Paso 3: Crear usuario mapping
-- Contraseña obtenida de credentials_system_ui.md
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
SERVER system_ui_server
OPTIONS (
    user 'postgres',                             -- Usuario PostgreSQL
    password 'VsNJX$@&eU9*!g6d'                  -- Contraseña de system_ui (credentials_system_ui.md)
);

-- Paso 4: Verificar conexión
-- SELECT * FROM dblink('system_ui_server', 'SELECT current_database(), current_user') 
-- AS t(dbname text, username text);

-- ============================================
-- EJEMPLO DE USO: Migrar datos directamente
-- ============================================
--
-- Una vez configurado, puedes migrar datos así:
--
-- INSERT INTO prospect_assignments (id, prospect_id, ...)
-- SELECT id, prospect_id, ...
-- FROM dblink('system_ui_server', 
--     'SELECT id, prospect_id, coordinacion_id, ejecutivo_id, assigned_at, assigned_by, assignment_type, assignment_reason, unassigned_at, is_active, created_at, updated_at FROM prospect_assignments'
-- ) AS t(
--     id uuid,
--     prospect_id uuid,
--     coordinacion_id uuid,
--     ejecutivo_id uuid,
--     assigned_at timestamptz,
--     assigned_by uuid,
--     assignment_type text,
--     assignment_reason text,
--     unassigned_at timestamptz,
--     is_active boolean,
--     created_at timestamptz,
--     updated_at timestamptz
-- )
-- WHERE NOT EXISTS (
--     SELECT 1 FROM prospect_assignments WHERE id = t.id
-- );
--
-- ============================================
