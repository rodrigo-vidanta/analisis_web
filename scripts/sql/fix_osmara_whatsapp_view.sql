-- ============================================
-- FIX: Actualizar Vista Materializada y Verificar Permisos
-- Para: Osmara Partida (osmarapartida@vidavacations.com)
-- ============================================

-- 1. REFRESCAR VISTA MATERIALIZADA
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversaciones_dashboard;

-- 2. VERIFICAR PERMISOS RLS EN LA VISTA
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'mv_conversaciones_dashboard';

-- 3. VERIFICAR POLÍTICAS RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'mv_conversaciones_dashboard';

-- 4. VERIFICAR GRANTS
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'mv_conversaciones_dashboard'
  AND table_schema = 'public';

-- 5. SI NO HAY PERMISOS, APLICAR:
-- GRANT SELECT ON mv_conversaciones_dashboard TO authenticated;
-- GRANT SELECT ON mv_conversaciones_dashboard TO anon;

-- 6. VERIFICAR QUE LA VISTA TIENE DATOS ACTUALIZADOS PARA OSMARA
SELECT 
  COUNT(*) as total_conversaciones,
  MAX(fecha_ultimo_mensaje) as ultimo_mensaje,
  MAX(vista_actualizada_at) as vista_actualizada
FROM mv_conversaciones_dashboard
WHERE ejecutivo_id = 'd7847ffa-0758-4eb2-a97b-f80e54886531';
