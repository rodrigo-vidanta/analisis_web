-- ============================================
-- DIAGNÓSTICO COMPLETO DE TRIGGERS DE PROSPECTOS
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- ============================================

-- 1. LISTAR TODOS LOS TRIGGERS DE PROSPECTOS
SELECT 
    '=== TRIGGERS EN PROSPECTOS ===' as seccion,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'prospectos'
ORDER BY 
    CASE action_timing WHEN 'BEFORE' THEN 1 WHEN 'AFTER' THEN 2 END,
    trigger_name;

-- 2. LISTAR TRIGGERS EN TABLAS RELACIONADAS
SELECT 
    '=== TRIGGERS EN TABLAS RELACIONADAS ===' as seccion,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE event_object_table IN ('llamadas_ventas', 'mensajes_whatsapp', 'conversaciones_whatsapp', 'agent_queue')
ORDER BY event_object_table, trigger_name;

-- 3. VERIFICAR FUNCIONES USADAS POR TRIGGERS
SELECT 
    '=== FUNCIONES DE TRIGGERS ===' as seccion,
    p.proname as function_name,
    CASE 
        WHEN p.proname = 'notify_live_monitor_change' THEN 'CRÍTICA: Verificar acceso a campos'
        WHEN p.proname LIKE '%update%' THEN 'Actualización'
        WHEN p.proname LIKE '%auto%' THEN 'Automatización'
        WHEN p.proname LIKE '%generar%' THEN 'Generación de datos'
        ELSE 'Otra'
    END as tipo_funcion
FROM pg_proc p
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND (
    p.proname IN (
        SELECT DISTINCT substring(t.action_statement from 'EXECUTE FUNCTION ([^(]+)')
        FROM information_schema.triggers t
        WHERE t.event_object_table = 'prospectos'
    )
)
ORDER BY p.proname;

-- 4. VERIFICAR TRIGGERS HUÉRFANOS (funciones que no existen)
SELECT 
    '=== TRIGGERS HUÉRFANOS ===' as seccion,
    t.trigger_name,
    t.event_object_table,
    substring(t.action_statement from 'EXECUTE FUNCTION ([^(]+)') as function_name,
    'FUNCIÓN NO EXISTE' as problema
FROM information_schema.triggers t
WHERE t.event_object_table = 'prospectos'
AND NOT EXISTS (
    SELECT 1 FROM pg_proc p 
    WHERE p.proname = substring(t.action_statement from 'EXECUTE FUNCTION ([^(]+)')
    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
);

-- 5. VERIFICAR CAMPOS DE PROSPECTOS QUE USAN LOS TRIGGERS
SELECT 
    '=== CAMPOS DE PROSPECTOS ===' as seccion,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'prospectos'
AND column_name IN (
    'id', 'nombre', 'apellido_paterno', 'apellido_materno', 'nombre_completo', 
    'nombre_whatsapp', 'whatsapp', 'coordinacion_id', 'ejecutivo_id', 
    'id_dynamics', 'updated_at', 'created_at'
)
ORDER BY column_name;

-- 6. VERIFICAR FUNCIÓN notify_live_monitor_change
SELECT 
    '=== DIAGNÓSTICO notify_live_monitor_change ===' as seccion,
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%TG_TABLE_NAME%' THEN '✅ OK: Verifica tabla antes de acceder campos'
        WHEN pg_get_functiondef(oid) LIKE '%NEW.call_id%' THEN '⚠️ PROBLEMA: Accede a call_id sin verificar tabla'
        ELSE '⚠️ REVISAR: No se detecta verificación de tabla'
    END as diagnostico
FROM pg_proc 
WHERE proname = 'notify_live_monitor_change'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 7. VERIFICAR TRIGGERS DUPLICADOS
SELECT 
    '=== TRIGGERS DUPLICADOS ===' as seccion,
    trigger_name,
    COUNT(*) as cantidad
FROM information_schema.triggers
WHERE event_object_table = 'prospectos'
GROUP BY trigger_name
HAVING COUNT(*) > 1;

-- 8. RESUMEN FINAL
SELECT 
    '=== RESUMEN ===' as seccion,
    COUNT(DISTINCT trigger_name) as total_triggers,
    COUNT(DISTINCT substring(action_statement from 'EXECUTE FUNCTION ([^(]+)')) as total_funciones
FROM information_schema.triggers
WHERE event_object_table = 'prospectos';

