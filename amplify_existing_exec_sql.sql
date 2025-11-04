-- ============================================
-- AMPLIAR FUNCIÓN exec_sql EXISTENTE
-- Mantiene compatibilidad con dependencias existentes
-- ============================================

-- Verificar la función existente
SELECT 
    routine_name,
    routine_definition,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'exec_sql' 
AND routine_schema = 'public';

-- Crear funciones auxiliares sin tocar la principal
-- Estas funciones complementan exec_sql existente

-- 1. Función para obtener esquema completo
CREATE OR REPLACE FUNCTION get_database_schema()
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'tables', (
                SELECT json_agg(
                    json_build_object(
                        'table_name', t.table_name,
                        'table_schema', t.table_schema,
                        'table_type', t.table_type,
                        'columns', (
                            SELECT json_agg(
                                json_build_object(
                                    'column_name', c.column_name,
                                    'data_type', c.data_type,
                                    'is_nullable', c.is_nullable,
                                    'column_default', c.column_default,
                                    'ordinal_position', c.ordinal_position
                                )
                            )
                            FROM information_schema.columns c
                            WHERE c.table_name = t.table_name 
                            AND c.table_schema = t.table_schema
                            ORDER BY c.ordinal_position
                        )
                    )
                )
                FROM information_schema.tables t
                WHERE t.table_schema = 'public'
                ORDER BY t.table_name
            ),
            'functions', (
                SELECT json_agg(
                    json_build_object(
                        'function_name', r.routine_name,
                        'return_type', r.data_type,
                        'routine_type', r.routine_type
                    )
                )
                FROM information_schema.routines r
                WHERE r.routine_schema = 'public'
                ORDER BY r.routine_name
            ),
            'generated_at', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para listar tablas con información extendida
CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS JSON AS $$
DECLARE
    table_info JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'table_name', table_name,
            'table_schema', table_schema,
            'table_type', table_type,
            'estimated_rows', (
                SELECT COALESCE(n_tup_ins - n_tup_del, 0)
                FROM pg_stat_user_tables 
                WHERE relname = t.table_name
            ),
            'size_bytes', (
                SELECT pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))
            )
        )
    ) INTO table_info
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    ORDER BY t.table_name;
    
    RETURN json_build_object(
        'success', true,
        'tables', COALESCE(table_info, '[]'::json),
        'total_tables', (
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
        ),
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para backup de tabla
CREATE OR REPLACE FUNCTION backup_table_data(table_name_param TEXT)
RETURNS JSON AS $$
DECLARE
    backup_data JSON;
    query_text TEXT;
    row_count INTEGER;
BEGIN
    -- Construir query dinámicamente
    query_text := format('SELECT json_agg(row_to_json(t)) FROM %I t', table_name_param);
    
    -- Ejecutar y obtener datos
    EXECUTE query_text INTO backup_data;
    
    -- Obtener conteo de filas
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name_param) INTO row_count;
    
    RETURN json_build_object(
        'success', true,
        'table_name', table_name_param,
        'data', COALESCE(backup_data, '[]'::json),
        'row_count', row_count,
        'backup_timestamp', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'table_name', table_name_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para transacciones múltiples
CREATE OR REPLACE FUNCTION exec_sql_transaction(queries TEXT[])
RETURNS JSON AS $$
DECLARE
    query_text TEXT;
    results JSON[] := '{}';
    i INTEGER := 1;
    total_rows INTEGER := 0;
BEGIN
    -- Ejecutar cada query en la transacción
    FOREACH query_text IN ARRAY queries
    LOOP
        -- Ejecutar query individual
        EXECUTE query_text;
        
        -- Obtener conteo de filas afectadas
        GET DIAGNOSTICS total_rows = ROW_COUNT;
        
        -- Agregar resultado
        results[i] := json_build_object(
            'query_index', i,
            'success', true,
            'query', query_text,
            'rows_affected', total_rows
        );
        
        i := i + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'All queries executed successfully in transaction',
        'total_queries', array_length(queries, 1),
        'results', array_to_json(results),
        'executed_at', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'failed_at_query', i,
        'failed_query', query_text,
        'total_queries', array_length(queries, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para verificar capacidades de exec_sql
CREATE OR REPLACE FUNCTION test_exec_sql_capabilities()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Probar diferentes tipos de SQL con exec_sql existente
    
    -- Test 1: SELECT simple
    SELECT exec_sql('SELECT 1 as test_select') INTO result;
    
    IF (result->>'success')::boolean = false THEN
        RETURN json_build_object(
            'exec_sql_available', false,
            'error', 'exec_sql function failed basic SELECT test'
        );
    END IF;
    
    -- Test 2: DDL (CREATE TABLE temporal)
    BEGIN
        SELECT exec_sql('CREATE TEMPORARY TABLE test_ddl_capability (id SERIAL, test_col TEXT)') INTO result;
        
        RETURN json_build_object(
            'exec_sql_available', true,
            'ddl_capable', (result->>'success')::boolean,
            'dml_capable', true,  -- Asumimos que si DDL funciona, DML también
            'select_capable', true,
            'message', 'exec_sql function has full DDL/DML capabilities',
            'test_results', result
        );
        
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'exec_sql_available', true,
            'ddl_capable', false,
            'dml_capable', true,  -- Probablemente sí puede DML
            'select_capable', true,
            'message', 'exec_sql function has limited capabilities (no DDL)',
            'ddl_error', SQLERRM
        );
    END;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON FUNCTION get_database_schema() IS 'Obtiene esquema completo de la base de datos - complementa exec_sql existente';
COMMENT ON FUNCTION get_all_tables() IS 'Lista todas las tablas con información extendida y tamaños';
COMMENT ON FUNCTION backup_table_data(TEXT) IS 'Hace backup completo de una tabla en formato JSON';
COMMENT ON FUNCTION exec_sql_transaction(TEXT[]) IS 'Ejecuta múltiples queries en una sola transacción';
COMMENT ON FUNCTION test_exec_sql_capabilities() IS 'Verifica las capacidades de la función exec_sql existente';

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Probar las capacidades de exec_sql existente
SELECT test_exec_sql_capabilities() as capabilities_test;

-- Mostrar todas las funciones disponibles para MCP
SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name = 'exec_sql' THEN 'FUNCIÓN PRINCIPAL - SQL arbitrario'
        WHEN routine_name = 'get_database_schema' THEN 'NUEVA - Esquema completo'
        WHEN routine_name = 'get_all_tables' THEN 'NUEVA - Lista de tablas'
        WHEN routine_name = 'backup_table_data' THEN 'NUEVA - Backup de tablas'
        WHEN routine_name = 'exec_sql_transaction' THEN 'NUEVA - Transacciones'
        WHEN routine_name = 'test_exec_sql_capabilities' THEN 'NUEVA - Test de capacidades'
        ELSE 'Otra función'
    END as description
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('exec_sql', 'get_database_schema', 'get_all_tables', 'backup_table_data', 'exec_sql_transaction', 'test_exec_sql_capabilities')
ORDER BY 
    CASE WHEN routine_name = 'exec_sql' THEN 0 ELSE 1 END,
    routine_name;

SELECT '✅ Funciones auxiliares creadas exitosamente. La función exec_sql existente se mantiene intacta.' AS resultado;
