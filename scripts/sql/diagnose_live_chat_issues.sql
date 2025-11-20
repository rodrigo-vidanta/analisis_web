-- ============================================
-- DIAGNÓSTICO COMPLETO DE LIVE CHAT
-- Ejecutar en ambas bases de datos
-- ============================================

-- ============================================
-- PARTE 1: BASE DE ANÁLISIS (glsmifhkoaifvaegsozd.supabase.co)
-- ============================================

-- 1. Verificar realtime en tablas críticas
SELECT 
    '=== REALTIME EN BASE DE ANÁLISIS ===' as seccion,
    tablename as tabla,
    'HABILITADO' as estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('mensajes_whatsapp', 'prospectos', 'llamadas_ventas')
ORDER BY tablename;

-- 2. Verificar que las tablas existen y tienen datos
SELECT 
    '=== DATOS EN TABLAS ===' as seccion,
    'mensajes_whatsapp' as tabla,
    COUNT(*)::text as total_registros,
    COUNT(DISTINCT prospecto_id)::text as prospectos_con_mensajes
FROM mensajes_whatsapp
UNION ALL
SELECT 
    '=== DATOS EN TABLAS ===' as seccion,
    'prospectos' as tabla,
    COUNT(*)::text as total_registros,
    COUNT(*) FILTER (WHERE whatsapp IS NOT NULL AND whatsapp != '')::text as con_whatsapp
FROM prospectos;

-- 3. Verificar función RPC
SELECT 
    '=== FUNCIÓN RPC ===' as seccion,
    COUNT(*)::text as conversaciones_devueltas
FROM get_conversations_ordered();

-- 4. Verificar triggers que pueden afectar
SELECT 
    '=== TRIGGERS ===' as seccion,
    trigger_name as nombre,
    event_object_table as tabla,
    action_timing as timing
FROM information_schema.triggers 
WHERE trigger_name LIKE 'live_monitor%'
ORDER BY event_object_table;

-- ============================================
-- PARTE 2: SYSTEMUI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- Ejecutar esta parte en SystemUI

-- 5. Verificar tabla user_notifications
SELECT 
    '=== TABLA user_notifications ===' as seccion,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_notifications'
    ) THEN 'EXISTE' ELSE 'NO EXISTE' END as estado;

-- 6. Verificar realtime en user_notifications
SELECT 
    '=== REALTIME EN SYSTEMUI ===' as seccion,
    tablename as tabla,
    'HABILITADO' as estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename = 'user_notifications';

-- 7. Verificar políticas RLS
SELECT 
    '=== POLÍTICAS RLS ===' as seccion,
    tablename as tabla,
    policyname as politica,
    permissive as permisivo
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_notifications'
ORDER BY policyname;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT 
    '✅ DIAGNÓSTICO COMPLETO' as resultado,
    'Revisa los resultados arriba para identificar problemas' as nota;

