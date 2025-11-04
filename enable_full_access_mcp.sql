-- ============================================
-- HABILITAR ACCESO COMPLETO PARA MCP SUPAVIDANTA
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================

-- LIMPIAR FUNCIONES EXISTENTES PRIMERO
DROP FUNCTION IF EXISTS exec_sql(text);
DROP FUNCTION IF EXISTS exec_sql(sql_query text);
DROP FUNCTION IF EXISTS exec_sql(query text);
DROP FUNCTION IF EXISTS get_database_schema();
DROP FUNCTION IF EXISTS get_all_tables();
DROP FUNCTION IF EXISTS backup_table_data(text);
DROP FUNCTION IF EXISTS backup_table_data(table_name_param text);
DROP FUNCTION IF EXISTS exec_sql_transaction(text[]);
DROP FUNCTION IF EXISTS exec_sql_transaction(queries text[]);

-- ============================================
-- CREAR FUNCIONES CON ACCESO COMPLETO
-- ============================================

-- 1. Función para ejecutar SQL arbitrario (DDL, DML, DQL)

CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    row_count INTEGER;
BEGIN
    -- Ejecutar la consulta dinámicamente
    EXECUTE query;
    
    -- Obtener el número de filas afectadas
    GET DIAGNOSTICS row_count = ROW_COUNT;
    
    -- Para consultas SELECT, intentar devolver los resultados
    IF UPPER(TRIM(query)) LIKE 'SELECT%' THEN
        BEGIN
            EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', query) INTO result;
            RETURN json_build_object(
                'success', true,
                'data', COALESCE(result, '[]'::json),
                'row_count', row_count,
                'query_type', 'SELECT'
            );
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
                'success', true,
                'message', 'Query executed successfully but could not return data',
                'row_count', row_count,
                'query_type', 'SELECT'
            );
        END;
    ELSE
        -- Para DDL/DML, devolver confirmación
        RETURN json_build_object(
            'success', true,
            'message', 'Query executed successfully',
            'row_count', row_count,
            'query_type', CASE 
                WHEN UPPER(TRIM(query)) LIKE 'CREATE%' THEN 'CREATE'
                WHEN UPPER(TRIM(query)) LIKE 'ALTER%' THEN 'ALTER'
                WHEN UPPER(TRIM(query)) LIKE 'DROP%' THEN 'DROP'
                WHEN UPPER(TRIM(query)) LIKE 'INSERT%' THEN 'INSERT'
                WHEN UPPER(TRIM(query)) LIKE 'UPDATE%' THEN 'UPDATE'
                WHEN UPPER(TRIM(query)) LIKE 'DELETE%' THEN 'DELETE'
                ELSE 'OTHER'
            END
        );
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'query', query
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para obtener información del esquema completo
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
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Función para listar todas las tablas con conteos
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
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para backup/restore de datos
CREATE OR REPLACE FUNCTION backup_table_data(table_name_param TEXT)
RETURNS JSON AS $$
DECLARE
    backup_data JSON;
    query_text TEXT;
BEGIN
    -- Construir query dinámicamente
    query_text := format('SELECT json_agg(row_to_json(t)) FROM %I t', table_name_param);
    
    -- Ejecutar y obtener datos
    EXECUTE query_text INTO backup_data;
    
    RETURN json_build_object(
        'success', true,
        'table_name', table_name_param,
        'data', COALESCE(backup_data, '[]'::json),
        'backup_timestamp', NOW()
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'table_name', table_name_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para ejecutar múltiples queries en transacción
CREATE OR REPLACE FUNCTION exec_sql_transaction(queries TEXT[])
RETURNS JSON AS $$
DECLARE
    query_text TEXT;
    results JSON[] := '{}';
    i INTEGER := 1;
BEGIN
    -- Ejecutar cada query en la transacción
    FOREACH query_text IN ARRAY queries
    LOOP
        -- Ejecutar query individual
        EXECUTE query_text;
        
        -- Agregar resultado
        results[i] := json_build_object(
            'query_index', i,
            'success', true,
            'query', query_text
        );
        
        i := i + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'All queries executed successfully in transaction',
        'total_queries', array_length(queries, 1),
        'results', array_to_json(results)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'failed_at_query', i,
        'total_queries', array_length(queries, 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS Y PERMISOS
-- ============================================

COMMENT ON FUNCTION exec_sql(TEXT) IS 'Ejecuta SQL arbitrario con acceso completo - USAR CON PRECAUCIÓN';
COMMENT ON FUNCTION get_database_schema() IS 'Obtiene esquema completo de la base de datos con tablas y columnas';
COMMENT ON FUNCTION get_all_tables() IS 'Lista todas las tablas con información básica y conteos estimados';
COMMENT ON FUNCTION backup_table_data(TEXT) IS 'Hace backup completo de una tabla en formato JSON';
COMMENT ON FUNCTION exec_sql_transaction(TEXT[]) IS 'Ejecuta múltiples queries en una sola transacción';

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================

-- Ejemplo de uso:
-- SELECT exec_sql('CREATE TABLE test_table (id SERIAL PRIMARY KEY, name TEXT)');
-- SELECT exec_sql('INSERT INTO test_table (name) VALUES (''test'')');
-- SELECT exec_sql('SELECT * FROM test_table');
-- SELECT get_database_schema();
-- SELECT get_all_tables();

SELECT 'Funciones de acceso completo creadas exitosamente. MCP SupaVidanta ahora tiene capacidades DDL completas.' AS resultado;
