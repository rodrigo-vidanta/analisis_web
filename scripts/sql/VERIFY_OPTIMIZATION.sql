-- ============================================
-- VERIFICACIÓN DE OPTIMIZACIÓN APLICADA
-- Ejecutar para confirmar que los índices funcionan
-- ============================================

-- 1. Verificar que todos los índices se crearon
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('calls', 'call_segments')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 2. Probar consulta optimizada (debería ser <500ms)
EXPLAIN ANALYZE
SELECT id, agent_name, customer_name, start_time, quality_score 
FROM calls 
WHERE start_time >= NOW() - INTERVAL '30 days'
ORDER BY start_time DESC 
LIMIT 100;

-- 3. Probar búsqueda por agente (debería ser <200ms)
EXPLAIN ANALYZE
SELECT COUNT(*) 
FROM calls 
WHERE agent_name IS NOT NULL
    AND start_time >= NOW() - INTERVAL '30 days';

-- 4. Estadísticas de la tabla
SELECT 
    schemaname,
    tablename,
    n_tup_ins as total_inserts,
    n_tup_upd as total_updates,
    n_tup_del as total_deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables 
WHERE tablename = 'calls';
