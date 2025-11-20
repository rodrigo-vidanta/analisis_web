-- ============================================
-- VERIFICACIÓN COMPLETA DE CONFIGURACIÓN REALTIME
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Ejecutar después de recrear las tablas
-- ============================================

-- 1. VERIFICAR QUE LAS TABLAS EXISTEN
SELECT 
    '=== TABLAS ===' as seccion,
    table_name as nombre,
    'EXISTE' as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('prospectos', 'llamadas_ventas', 'agent_queue')
ORDER BY table_name;

-- 2. VERIFICAR REALTIME EN PUBLICACIONES
SELECT 
    '=== REALTIME PUBLICACIONES ===' as seccion,
    tablename as tabla,
    'HABILITADO' as estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('prospectos', 'llamadas_ventas')
ORDER BY tablename;

-- 3. VERIFICAR TRIGGERS DE LIVE MONITOR
SELECT 
    '=== TRIGGERS LIVE MONITOR ===' as seccion,
    trigger_name as nombre,
    event_object_table as tabla,
    action_timing as timing,
    event_manipulation as evento
FROM information_schema.triggers 
WHERE trigger_name LIKE 'live_monitor%'
ORDER BY event_object_table, trigger_name;

-- 4. VERIFICAR FUNCIÓN notify_live_monitor_change
SELECT 
    '=== FUNCIÓN NOTIFY ===' as seccion,
    routine_name as nombre,
    routine_type as tipo,
    'EXISTE' as estado
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'notify_live_monitor_change';

-- 5. VERIFICAR ÍNDICES CRÍTICOS
SELECT 
    '=== ÍNDICES CRÍTICOS ===' as seccion,
    tablename as tabla,
    indexname as indice,
    indexdef as definicion
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('prospectos', 'llamadas_ventas')
AND (
    indexname LIKE '%call_id%' OR
    indexname LIKE '%prospecto%' OR
    indexname LIKE '%whatsapp%' OR
    indexname LIKE '%email%' OR
    indexname LIKE '%status_transferencia%'
)
ORDER BY tablename, indexname;

-- 6. VERIFICAR FOREIGN KEYS
SELECT 
    '=== FOREIGN KEYS ===' as seccion,
    tc.table_name as tabla_origen,
    kcu.column_name as columna,
    ccu.table_name AS tabla_referenciada,
    ccu.column_name AS columna_referenciada
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('llamadas_ventas', 'prospectos')
ORDER BY tc.table_name;

-- 7. VERIFICAR RLS (Row Level Security)
SELECT 
    '=== RLS POLICIES ===' as seccion,
    schemaname as schema,
    tablename as tabla,
    policyname as politica,
    permissive as permisivo,
    roles as roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('prospectos', 'llamadas_ventas', 'agent_queue')
ORDER BY tablename, policyname;

-- 8. CONTEO DE REGISTROS (para verificar que las tablas tienen datos o están listas)
SELECT 
    '=== CONTEO DE REGISTROS ===' as seccion,
    'prospectos' as tabla,
    COUNT(*)::text as total_registros
FROM prospectos
UNION ALL
SELECT 
    '=== CONTEO DE REGISTROS ===' as seccion,
    'llamadas_ventas' as tabla,
    COUNT(*)::text as total_registros
FROM llamadas_ventas
UNION ALL
SELECT 
    '=== CONTEO DE REGISTROS ===' as seccion,
    'agent_queue' as tabla,
    COUNT(*)::text as total_registros
FROM agent_queue;

-- 9. VERIFICAR COLUMNAS CRÍTICAS EN PROSPECTOS
SELECT 
    '=== COLUMNAS PROSPECTOS ===' as seccion,
    column_name as columna,
    data_type as tipo,
    is_nullable as nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'prospectos'
AND column_name IN (
    'id', 'nombre_completo', 'whatsapp', 'email', 
    'coordinacion_id', 'ejecutivo_id', 
    'status_transferencia', 'temperatura_prospecto',
    'created_at', 'updated_at'
)
ORDER BY column_name;

-- 10. VERIFICAR COLUMNAS CRÍTICAS EN LLAMADAS_VENTAS
SELECT 
    '=== COLUMNAS LLAMADAS_VENTAS ===' as seccion,
    column_name as columna,
    data_type as tipo,
    is_nullable as nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'llamadas_ventas'
AND column_name IN (
    'id', 'call_id', 'prospecto', 'fecha_llamada',
    'call_status', 'checkpoint_venta_actual',
    'coordinacion_id', 'ejecutivo_id',
    'created_at', 'updated_at'
)
ORDER BY column_name;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT 
    '✅ VERIFICACIÓN COMPLETA' as resultado,
    'Revisa los resultados arriba para confirmar que todo está configurado correctamente' as nota;

