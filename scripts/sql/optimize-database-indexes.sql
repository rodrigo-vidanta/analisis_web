-- ============================================
-- OPTIMIZACIÓN DE ÍNDICES PARA PERFORMANCE
-- Fecha: 2025-01-24
-- Propósito: Mejorar rendimiento para 1.5M registros + 10 usuarios simultáneos
-- Base: hmmfuhqgvsehkizlfzga.supabase.co
-- ============================================

-- 📊 ÍNDICES PRINCIPALES PARA TABLA CALLS
-- ============================================

-- ÍNDICE 1: start_time (Más importante - usado en ORDER BY y filtros de fecha)
CREATE INDEX IF NOT EXISTS idx_calls_start_time 
ON calls(start_time DESC NULLS LAST);

-- ÍNDICE 2: agent_name (Para filtros de agente)
CREATE INDEX IF NOT EXISTS idx_calls_agent_name 
ON calls(agent_name);

-- ÍNDICE 3: customer_name (Para búsquedas de cliente)
CREATE INDEX IF NOT EXISTS idx_calls_customer_name 
ON calls(customer_name);

-- ÍNDICE 4: quality_score (Para filtros de calidad)
CREATE INDEX IF NOT EXISTS idx_calls_quality_score 
ON calls(quality_score DESC NULLS LAST);

-- ÍNDICE 5: call_result (Para filtros de resultado)
CREATE INDEX IF NOT EXISTS idx_calls_result 
ON calls(call_result);

-- ÍNDICE 6: organization (Para filtros de organización)
CREATE INDEX IF NOT EXISTS idx_calls_organization 
ON calls(organization);

-- ÍNDICE 7: direction (Para filtros de dirección Inbound/Outbound)
CREATE INDEX IF NOT EXISTS idx_calls_direction 
ON calls(direction);

-- ============================================
-- 🔥 ÍNDICES COMPUESTOS PARA CONSULTAS COMPLEJAS
-- ============================================

-- ÍNDICE COMPUESTO 1: Consulta principal (start_time + quality_score)
-- Para: ORDER BY start_time con filtro de calidad
CREATE INDEX IF NOT EXISTS idx_calls_time_quality 
ON calls(start_time DESC, quality_score DESC) 
WHERE quality_score IS NOT NULL;

-- ÍNDICE COMPUESTO 2: Búsqueda por agente y fecha
-- Para: Filtros de agente específico en rango de fechas
CREATE INDEX IF NOT EXISTS idx_calls_agent_time 
ON calls(agent_name, start_time DESC) 
WHERE agent_name IS NOT NULL;

-- ÍNDICE COMPUESTO 3: Filtros múltiples
-- Para: Combinación de organización, dirección y fecha
CREATE INDEX IF NOT EXISTS idx_calls_org_dir_time 
ON calls(organization, direction, start_time DESC) 
WHERE organization IS NOT NULL AND direction IS NOT NULL;

-- ============================================
-- 📝 ÍNDICES PARA TABLA CALL_SEGMENTS
-- ============================================

-- ÍNDICE 1: call_id (FK más importante)
CREATE INDEX IF NOT EXISTS idx_segments_call_id 
ON call_segments(call_id);

-- ÍNDICE 2: segment_index para orden
CREATE INDEX IF NOT EXISTS idx_segments_call_index 
ON call_segments(call_id, segment_index);

-- ============================================
-- 🔍 ÍNDICES PARA BÚSQUEDA FULL-TEXT
-- ============================================

-- ÍNDICE GIN para búsqueda en customer_name (búsqueda parcial)
CREATE INDEX IF NOT EXISTS idx_calls_customer_search 
ON calls USING gin(to_tsvector('spanish', customer_name));

-- ÍNDICE GIN para búsqueda en agent_name (búsqueda parcial)
CREATE INDEX IF NOT EXISTS idx_calls_agent_search 
ON calls USING gin(to_tsvector('spanish', agent_name));

-- ============================================
-- 📊 ÍNDICES PARA CAMPOS JSONB
-- ============================================

-- ÍNDICE para score_ponderado en agent_performance
CREATE INDEX IF NOT EXISTS idx_calls_score_ponderado 
ON calls USING btree((agent_performance->>'score_ponderado')::numeric);

-- ÍNDICE para rapport_score en comunicacion_data
CREATE INDEX IF NOT EXISTS idx_calls_rapport_score 
ON calls USING btree((comunicacion_data->'rapport_metricas'->>'score_ponderado')::numeric);

-- ============================================
-- 🎯 ESTADÍSTICAS PARA EL OPTIMIZADOR
-- ============================================

-- Actualizar estadísticas para mejores planes de ejecución
ANALYZE calls;
ANALYZE call_segments;

-- ============================================
-- 📋 VERIFICACIÓN DE ÍNDICES CREADOS
-- ============================================

-- Consulta para verificar que todos los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('calls', 'call_segments')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- 💡 RECOMENDACIONES DE USO
-- ============================================

/*
CONSULTAS OPTIMIZADAS DESPUÉS DE APLICAR ÍNDICES:

1. Consulta principal con filtro de fecha (RÁPIDA):
SELECT * FROM calls 
WHERE start_time >= NOW() - INTERVAL '30 days'
ORDER BY start_time DESC 
LIMIT 100;

2. Búsqueda por agente (RÁPIDA):
SELECT * FROM calls 
WHERE agent_name = 'Nombre Agente'
    AND start_time >= NOW() - INTERVAL '30 days'
ORDER BY start_time DESC;

3. Filtro por calidad (RÁPIDA):
SELECT * FROM calls 
WHERE quality_score >= 80
    AND start_time >= NOW() - INTERVAL '30 days'
ORDER BY quality_score DESC;

4. Búsqueda full-text (RÁPIDA):
SELECT * FROM calls 
WHERE to_tsvector('spanish', customer_name) @@ to_tsquery('spanish', 'nombre_cliente')
    AND start_time >= NOW() - INTERVAL '30 days';

RESULTADO ESPERADO:
- Consultas que antes tomaban 15-30 segundos ahora tomarán 200-500ms
- Búsquedas y filtros serán instantáneos
- Soporte para 10+ usuarios simultáneos sin degradación
*/
