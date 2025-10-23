-- ============================================
-- FIX PARA LIVE MONITOR: DESACTIVAR RLS
-- ============================================

-- Desactivar RLS en llamadas_ventas para permitir acceso anon
ALTER TABLE public.llamadas_ventas DISABLE ROW LEVEL SECURITY;

-- Desactivar RLS en conversaciones_whatsapp para permitir acceso anon
ALTER TABLE public.conversaciones_whatsapp DISABLE ROW LEVEL SECURITY;

-- Asegurar que las tablas estén en la publicación de Realtime
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'llamadas_ventas'
  ) THEN 
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.llamadas_ventas';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'conversaciones_whatsapp'
  ) THEN 
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversaciones_whatsapp';
  END IF;
END $$;

-- Crear índice para mejorar performance en Live Monitor
CREATE INDEX IF NOT EXISTS idx_llamadas_ventas_call_id ON public.llamadas_ventas(call_id);
CREATE INDEX IF NOT EXISTS idx_llamadas_ventas_status_fecha ON public.llamadas_ventas(call_status, fecha_llamada DESC);

-- Insertar datos de prueba para Live Monitor
INSERT INTO public.llamadas_ventas (
  call_id,
  call_status,
  fecha_llamada,
  duracion_segundos,
  monitor_url,
  control_url,
  prospecto
) VALUES 
(
  'test_live_' || extract(epoch from now())::text,
  'activa',
  now(),
  0,
  'wss://test.monitor.url/live',
  'https://test.control.url/live',
  null
),
(
  'test_finished_' || extract(epoch from now())::text,
  'finalizada',
  now() - interval '5 minutes',
  180,
  null,
  null,
  null
),
(
  'test_failed_' || extract(epoch from now())::text,
  'perdida',
  now() - interval '10 minutes',
  0,
  null,
  null,
  null
)
ON CONFLICT (call_id) DO NOTHING;

-- Verificar que los datos se insertaron
SELECT 
  'Registros en llamadas_ventas:' as info,
  count(*) as total,
  count(*) FILTER (WHERE call_status = 'activa') as activas,
  count(*) FILTER (WHERE call_status = 'finalizada') as finalizadas,
  count(*) FILTER (WHERE call_status = 'perdida') as perdidas
FROM public.llamadas_ventas;
