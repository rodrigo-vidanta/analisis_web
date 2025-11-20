-- ============================================
-- PRUEBAS DE FUNCIONALIDAD REALTIME
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Ejecutar para probar que realtime funciona correctamente
-- ============================================

-- ⚠️ IMPORTANTE: Estas pruebas modifican datos temporalmente
-- Ejecutar solo en ambiente de desarrollo/testing

-- ============================================
-- PRUEBA 1: Verificar que las tablas están en la publicación realtime
-- ============================================
DO $$
DECLARE
    v_prospectos_enabled BOOLEAN;
    v_llamadas_enabled BOOLEAN;
BEGIN
    -- Verificar prospectos
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'prospectos'
    ) INTO v_prospectos_enabled;
    
    -- Verificar llamadas_ventas
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'llamadas_ventas'
    ) INTO v_llamadas_enabled;
    
    IF v_prospectos_enabled AND v_llamadas_enabled THEN
        RAISE NOTICE '✅ PRUEBA 1 PASADA: Ambas tablas están en la publicación realtime';
    ELSE
        RAISE WARNING '❌ PRUEBA 1 FALLÓ: prospectos=%, llamadas_ventas=%', v_prospectos_enabled, v_llamadas_enabled;
    END IF;
END $$;

-- ============================================
-- PRUEBA 2: Verificar que los triggers existen
-- ============================================
DO $$
DECLARE
    v_trigger_llamadas BOOLEAN;
    v_trigger_prospectos BOOLEAN;
BEGIN
    -- Verificar trigger en llamadas_ventas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'live_monitor_llamadas_trigger' 
        AND event_object_table = 'llamadas_ventas'
    ) INTO v_trigger_llamadas;
    
    -- Verificar trigger en prospectos
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'live_monitor_prospectos_trigger' 
        AND event_object_table = 'prospectos'
    ) INTO v_trigger_prospectos;
    
    IF v_trigger_llamadas AND v_trigger_prospectos THEN
        RAISE NOTICE '✅ PRUEBA 2 PASADA: Ambos triggers existen';
    ELSE
        RAISE WARNING '❌ PRUEBA 2 FALLÓ: trigger_llamadas=%, trigger_prospectos=%', v_trigger_llamadas, v_trigger_prospectos;
    END IF;
END $$;

-- ============================================
-- PRUEBA 3: Verificar que la función notify existe
-- ============================================
DO $$
DECLARE
    v_function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'notify_live_monitor_change'
    ) INTO v_function_exists;
    
    IF v_function_exists THEN
        RAISE NOTICE '✅ PRUEBA 3 PASADA: Función notify_live_monitor_change existe';
    ELSE
        RAISE WARNING '❌ PRUEBA 3 FALLÓ: Función notify_live_monitor_change no existe';
    END IF;
END $$;

-- ============================================
-- PRUEBA 4: Verificar estructura de tablas (columnas críticas)
-- ============================================
DO $$
DECLARE
    v_prospectos_ok BOOLEAN;
    v_llamadas_ok BOOLEAN;
    v_missing_cols TEXT;
BEGIN
    -- Verificar columnas críticas en prospectos
    SELECT NOT EXISTS (
        SELECT 1 FROM (
            SELECT unnest(ARRAY['id', 'nombre_completo', 'whatsapp', 'coordinacion_id', 'ejecutivo_id', 'status_transferencia', 'created_at', 'updated_at']) AS col
        ) required
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'prospectos' 
            AND column_name = required.col
        )
    ) INTO v_prospectos_ok;
    
    -- Verificar columnas críticas en llamadas_ventas
    SELECT NOT EXISTS (
        SELECT 1 FROM (
            SELECT unnest(ARRAY['id', 'call_id', 'prospecto', 'call_status', 'checkpoint_venta_actual', 'coordinacion_id', 'ejecutivo_id', 'created_at', 'updated_at']) AS col
        ) required
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'llamadas_ventas' 
            AND column_name = required.col
        )
    ) INTO v_llamadas_ok;
    
    IF v_prospectos_ok AND v_llamadas_ok THEN
        RAISE NOTICE '✅ PRUEBA 4 PASADA: Todas las columnas críticas existen';
    ELSE
        RAISE WARNING '❌ PRUEBA 4 FALLÓ: prospectos=%, llamadas_ventas=%', v_prospectos_ok, v_llamadas_ok;
    END IF;
END $$;

-- ============================================
-- PRUEBA 5: Verificar foreign key prospectos -> llamadas_ventas
-- ============================================
DO $$
DECLARE
    v_fk_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_schema = 'public' 
        AND table_name = 'llamadas_ventas'
        AND constraint_name LIKE '%prospecto%'
    ) INTO v_fk_exists;
    
    IF v_fk_exists THEN
        RAISE NOTICE '✅ PRUEBA 5 PASADA: Foreign key de llamadas_ventas a prospectos existe';
    ELSE
        RAISE WARNING '❌ PRUEBA 5 FALLÓ: Foreign key no encontrada';
    END IF;
END $$;

-- ============================================
-- PRUEBA 6: Verificar índices críticos
-- ============================================
DO $$
DECLARE
    v_idx_call_id BOOLEAN;
    v_idx_prospecto BOOLEAN;
    v_idx_whatsapp BOOLEAN;
BEGIN
    -- Índice en call_id
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'llamadas_ventas' 
        AND indexname LIKE '%call_id%'
    ) INTO v_idx_call_id;
    
    -- Índice en prospecto
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'llamadas_ventas' 
        AND indexname LIKE '%prospecto%'
    ) INTO v_idx_prospecto;
    
    -- Índice en whatsapp
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'prospectos' 
        AND indexname LIKE '%whatsapp%'
    ) INTO v_idx_whatsapp;
    
    IF v_idx_call_id AND v_idx_prospecto AND v_idx_whatsapp THEN
        RAISE NOTICE '✅ PRUEBA 6 PASADA: Índices críticos existen';
    ELSE
        RAISE WARNING '❌ PRUEBA 6 FALLÓ: call_id=%, prospecto=%, whatsapp=%', v_idx_call_id, v_idx_prospecto, v_idx_whatsapp;
    END IF;
END $$;

-- ============================================
-- PRUEBA 7: Verificar RLS está habilitado
-- ============================================
DO $$
DECLARE
    v_rls_prospectos BOOLEAN;
    v_rls_llamadas BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO v_rls_prospectos
    FROM pg_class 
    WHERE relname = 'prospectos' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    SELECT relrowsecurity INTO v_rls_llamadas
    FROM pg_class 
    WHERE relname = 'llamadas_ventas' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF v_rls_prospectos AND v_rls_llamadas THEN
        RAISE NOTICE '✅ PRUEBA 7 PASADA: RLS está habilitado en ambas tablas';
    ELSE
        RAISE WARNING '❌ PRUEBA 7 FALLÓ: RLS prospectos=%, RLS llamadas=%', v_rls_prospectos, v_rls_llamadas;
    END IF;
END $$;

-- ============================================
-- RESUMEN DE PRUEBAS
-- ============================================
SELECT 
    '📊 RESUMEN DE PRUEBAS COMPLETADO' as resultado,
    'Revisa los mensajes NOTICE y WARNING arriba para ver el estado de cada prueba' as nota;

