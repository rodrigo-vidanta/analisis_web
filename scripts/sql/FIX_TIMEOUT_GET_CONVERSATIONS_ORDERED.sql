-- ============================================
-- FIX: Timeout en get_conversations_ordered
-- ============================================
-- Problema: Query tarda >8s (statement timeout)
-- Solución: Crear índices específicos para la función
-- Fecha: 4 de Febrero 2026

-- ============================================
-- PASO 1: Verificar índices existentes
-- ============================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('conversaciones_whatsapp', 'mensajes_whatsapp', 'prospectos')
ORDER BY tablename, indexname;

-- ============================================
-- PASO 2: Crear índices para performance
-- ============================================

-- Índice compuesto para conversaciones_whatsapp (usado por get_conversations_ordered)
CREATE INDEX IF NOT EXISTS idx_conversaciones_whatsapp_updated_at_desc 
ON conversaciones_whatsapp (updated_at DESC NULLS LAST);

-- Índice para JOIN con prospectos (ejecutivo_id + coordinacion_id)
CREATE INDEX IF NOT EXISTS idx_prospectos_ejecutivo_coordinacion 
ON prospectos (ejecutivo_id, coordinacion_id) 
WHERE ejecutivo_id IS NOT NULL;

-- Índice para mensajes no leídos (usado en el COUNT)
CREATE INDEX IF NOT EXISTS idx_mensajes_whatsapp_not_leido 
ON mensajes_whatsapp (prospecto_id, leido) 
WHERE leido = false;

-- Índice para último mensaje (usado en ORDER BY)
CREATE INDEX IF NOT EXISTS idx_mensajes_whatsapp_prospecto_created 
ON mensajes_whatsapp (prospecto_id, created_at DESC);

-- ============================================
-- PASO 3: Analizar tablas para estadísticas
-- ============================================
ANALYZE conversaciones_whatsapp;
ANALYZE mensajes_whatsapp;
ANALYZE prospectos;

-- ============================================
-- PASO 4: Verificar nuevos índices
-- ============================================
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE tablename IN ('conversaciones_whatsapp', 'mensajes_whatsapp', 'prospectos')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- PASO 5: Test de performance
-- ============================================
EXPLAIN ANALYZE
SELECT * FROM get_conversations_ordered(200, 0);

-- Debe tardar <3s (antes: >8s)
