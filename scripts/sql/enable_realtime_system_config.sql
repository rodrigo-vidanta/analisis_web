-- Habilitar Realtime en tablas necesarias
-- Ejecutar en Supabase Dashboard: Database > Replication o SQL Editor

-- ============================================
-- 1. Habilitar Realtime en system_config (control de versiones)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;

-- ============================================
-- 2. Habilitar Realtime en llamadas_programadas (widget dashboard)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.llamadas_programadas;

-- ============================================
-- Verificar que están habilitadas
-- ============================================
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('system_config', 'llamadas_programadas')
ORDER BY tablename;

-- Si la consulta anterior retorna 2 filas, realtime está habilitado ✅
-- 
-- Nota: Si alguna tabla ya está habilitada, verás un error pero es seguro ignorarlo.
-- El comando es idempotente (puede ejecutarse múltiples veces sin problemas).
