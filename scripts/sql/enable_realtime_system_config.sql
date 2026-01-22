-- Habilitar Realtime en system_config para el sistema de control de versiones
-- Ejecutar en Supabase Dashboard: Database > Replication o SQL Editor

-- Agregar system_config a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_config;

-- Verificar que está habilitado
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'system_config';

-- Si la consulta anterior retorna una fila, realtime está habilitado ✅
