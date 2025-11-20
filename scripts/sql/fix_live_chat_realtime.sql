-- ============================================
-- CORREGIR REALTIME PARA LIVE CHAT
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- ============================================

-- 1. Verificar estado actual de realtime
SELECT 
    '=== ESTADO ACTUAL DE REALTIME ===' as seccion,
    tablename as tabla,
    'HABILITADO' as estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('mensajes_whatsapp', 'prospectos')
ORDER BY tablename;

-- 2. Habilitar realtime en mensajes_whatsapp
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE mensajes_whatsapp;
        RAISE NOTICE '✅ Realtime habilitado en mensajes_whatsapp';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ mensajes_whatsapp ya tiene realtime habilitado';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error habilitando realtime en mensajes_whatsapp: %', SQLERRM;
    END;
END $$;

-- 3. Habilitar realtime en prospectos (si no está ya)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE prospectos;
        RAISE NOTICE '✅ Realtime habilitado en prospectos';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ prospectos ya tiene realtime habilitado';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error habilitando realtime en prospectos: %', SQLERRM;
    END;
END $$;

-- 4. Verificar que las tablas existen y tienen datos
SELECT 
    '=== VERIFICACIÓN DE TABLAS ===' as seccion,
    'mensajes_whatsapp' as tabla,
    COUNT(*)::text as total_registros
FROM mensajes_whatsapp
UNION ALL
SELECT 
    '=== VERIFICACIÓN DE TABLAS ===' as seccion,
    'prospectos' as tabla,
    COUNT(*)::text as total_registros
FROM prospectos;

-- 5. Verificar que la función RPC funciona
SELECT 
    '=== FUNCIÓN RPC ===' as seccion,
    COUNT(*)::text as conversaciones_devueltas
FROM get_conversations_ordered();

-- 6. Verificar triggers de live monitor (pueden afectar realtime)
SELECT 
    '=== TRIGGERS ===' as seccion,
    trigger_name as nombre,
    event_object_table as tabla
FROM information_schema.triggers 
WHERE trigger_name LIKE 'live_monitor%'
ORDER BY event_object_table;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT 
    '✅ VERIFICACIÓN COMPLETA' as resultado,
    'Revisa los resultados arriba para confirmar que todo está configurado' as nota;

