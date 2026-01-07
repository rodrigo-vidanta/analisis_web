-- ============================================
-- HABILITAR ACCESO COMPLETO PARA MCPs Supabase
-- Ejecutar en Supabase Dashboard > SQL Editor
-- Versión: 2.0.0 - Corregido GROUP BY issues
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
-- 1. FUNCIÓN PARA EJECUTAR SQL ARBITRARIO
-- ============================================

CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
    row_count INTEGER;
    query_upper TEXT;
BEGIN
    query_upper := UPPER(TRIM(query));
    
    -- Para consultas SELECT, usar json_agg directamente
    IF query_upper LIKE 'SELECT%' THEN
        BEGIN
            EXECUTE format('SELECT COALESCE(json_agg(row_to_json(subq)), ''[]''::json) FROM (%s) subq', query) INTO result;
            GET DIAGNOSTICS row_count = ROW_COUNT;
            RETURN json_build_object(
                'success', true,
                'data', result,
                'row_count', COALESCE(json_array_length(result), 0),
                'query_type', 'SELECT'
            );
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'error', SQLERRM,
                'error_code', SQLSTATE,
                'query_type', 'SELECT'
            );
        END;
    ELSE
        -- Para DDL/DML, ejecutar y devolver confirmación
        BEGIN
            EXECUTE query;
            GET DIAGNOSTICS row_count = ROW_COUNT;
            RETURN json_build_object(
                'success', true,
                'message', 'Query executed successfully',
                'row_count', row_count,
                'query_type', CASE 
                    WHEN query_upper LIKE 'CREATE%' THEN 'CREATE'
                    WHEN query_upper LIKE 'ALTER%' THEN 'ALTER'
                    WHEN query_upper LIKE 'DROP%' THEN 'DROP'
                    WHEN query_upper LIKE 'INSERT%' THEN 'INSERT'
                    WHEN query_upper LIKE 'UPDATE%' THEN 'UPDATE'
                    WHEN query_upper LIKE 'DELETE%' THEN 'DELETE'
                    WHEN query_upper LIKE 'TRUNCATE%' THEN 'TRUNCATE'
                    ELSE 'OTHER'
                END
            );
        EXCEPTION WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'error', SQLERRM,
                'error_code', SQLSTATE,
                'query', query
            );
        END;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FUNCIÓN PARA OBTENER ESQUEMA DE BD
-- ============================================

CREATE OR REPLACE FUNCTION get_database_schema()
RETURNS JSON AS $$
DECLARE
    tables_json JSON;
    functions_json JSON;
BEGIN
    -- Obtener tablas con sus columnas
    SELECT json_agg(table_data)
    INTO tables_json
    FROM (
        SELECT 
            t.table_name,
            t.table_type,
            (
                SELECT json_agg(
                    json_build_object(
                        'column_name', c.column_name,
                        'data_type', c.data_type,
                        'is_nullable', c.is_nullable,
                        'column_default', c.column_default
                    ) ORDER BY c.ordinal_position
                )
                FROM information_schema.columns c
                WHERE c.table_schema = 'public' 
                AND c.table_name = t.table_name
            ) as columns
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name
    ) as table_data;

    -- Obtener funciones
    SELECT json_agg(
        json_build_object(
            'function_name', r.routine_name,
            'return_type', r.data_type,
            'routine_type', r.routine_type
        )
    )
    INTO functions_json
    FROM information_schema.routines r
    WHERE r.routine_schema = 'public';

    RETURN json_build_object(
        'tables', COALESCE(tables_json, '[]'::json),
        'functions', COALESCE(functions_json, '[]'::json),
        'generated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FUNCIÓN PARA LISTAR TABLAS
-- ============================================

CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS JSON AS $$
DECLARE
    tables_json JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'table_name', t.table_name,
            'table_type', t.table_type
        ) ORDER BY t.table_name
    )
    INTO tables_json
    FROM information_schema.tables t
    WHERE t.table_schema = 'public';
    
    RETURN json_build_object(
        'success', true,
        'tables', COALESCE(tables_json, '[]'::json),
        'total_tables', (
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCIÓN PARA BACKUP DE TABLA
-- ============================================

CREATE OR REPLACE FUNCTION backup_table_data(table_name_param TEXT)
RETURNS JSON AS $$
DECLARE
    backup_data JSON;
    query_text TEXT;
    row_count INTEGER;
BEGIN
    -- Verificar que la tabla existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name_param
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Table %I does not exist', table_name_param),
            'table_name', table_name_param
        );
    END IF;

    -- Construir query dinámicamente
    query_text := format('SELECT COALESCE(json_agg(row_to_json(t)), ''[]''::json) FROM %I t', table_name_param);
    
    -- Ejecutar y obtener datos
    EXECUTE query_text INTO backup_data;
    
    -- Obtener conteo
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name_param) INTO row_count;
    
    RETURN json_build_object(
        'success', true,
        'table_name', table_name_param,
        'row_count', row_count,
        'data', backup_data,
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

-- ============================================
-- 5. FUNCIÓN PARA TRANSACCIONES
-- ============================================

CREATE OR REPLACE FUNCTION exec_sql_transaction(queries TEXT[])
RETURNS JSON AS $$
DECLARE
    query_text TEXT;
    results JSON[] := '{}';
    i INTEGER := 1;
    total_queries INTEGER;
BEGIN
    total_queries := array_length(queries, 1);
    
    IF total_queries IS NULL OR total_queries = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No queries provided',
            'total_queries', 0
        );
    END IF;

    -- Ejecutar cada query en la transacción
    FOREACH query_text IN ARRAY queries
    LOOP
        BEGIN
            EXECUTE query_text;
            results[i] := json_build_object(
                'query_index', i,
                'success', true,
                'query', LEFT(query_text, 100) -- Truncar para seguridad
            );
        EXCEPTION WHEN OTHERS THEN
            -- Si falla, hacer rollback implícito al salir
            RETURN json_build_object(
                'success', false,
                'error', SQLERRM,
                'error_code', SQLSTATE,
                'failed_at_query', i,
                'failed_query', LEFT(query_text, 100),
                'total_queries', total_queries,
                'completed_before_failure', i - 1
            );
        END;
        
        i := i + 1;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', 'All queries executed successfully',
        'total_queries', total_queries,
        'results', array_to_json(results)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNCIÓN PARA INFO DE UNA TABLA
-- ============================================

CREATE OR REPLACE FUNCTION get_table_info(table_name_param TEXT)
RETURNS JSON AS $$
DECLARE
    columns_json JSON;
    constraints_json JSON;
    indexes_json JSON;
BEGIN
    -- Verificar que la tabla existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name_param
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Table %I does not exist', table_name_param),
            'table_name', table_name_param
        );
    END IF;

    -- Obtener columnas
    SELECT json_agg(
        json_build_object(
            'column_name', column_name,
            'data_type', data_type,
            'is_nullable', is_nullable,
            'column_default', column_default,
            'ordinal_position', ordinal_position
        ) ORDER BY ordinal_position
    )
    INTO columns_json
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = table_name_param;

    -- Obtener constraints
    SELECT json_agg(
        json_build_object(
            'constraint_name', constraint_name,
            'constraint_type', constraint_type
        )
    )
    INTO constraints_json
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = table_name_param;

    RETURN json_build_object(
        'success', true,
        'table_name', table_name_param,
        'columns', COALESCE(columns_json, '[]'::json),
        'constraints', COALESCE(constraints_json, '[]'::json),
        'column_count', (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name_param)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON FUNCTION exec_sql(TEXT) IS 'Ejecuta SQL arbitrario con acceso completo - USAR CON PRECAUCIÓN';
COMMENT ON FUNCTION get_database_schema() IS 'Obtiene esquema completo de la base de datos';
COMMENT ON FUNCTION get_all_tables() IS 'Lista todas las tablas públicas';
COMMENT ON FUNCTION backup_table_data(TEXT) IS 'Hace backup completo de una tabla en JSON';
COMMENT ON FUNCTION exec_sql_transaction(TEXT[]) IS 'Ejecuta múltiples queries en una transacción';
COMMENT ON FUNCTION get_table_info(TEXT) IS 'Obtiene información detallada de una tabla';

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 'Funciones MCP creadas exitosamente v2.0.0' AS resultado,
       (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('exec_sql', 'get_database_schema', 'get_all_tables', 'backup_table_data', 'exec_sql_transaction', 'get_table_info')) AS funciones_creadas;
