-- ============================================
-- SINCRONIZAR is_operativo CON SESIONES ACTIVAS
-- ============================================
-- 
-- Fecha: 30 Enero 2026
-- Propósito: Actualizar is_operativo basándose en sesiones activas
--
-- Este script:
-- 1. Establece is_operativo = true para usuarios con sesión activa
-- 2. Establece is_operativo = false para usuarios sin sesión activa
--
-- ============================================

BEGIN;

-- ============================================
-- PASO 1: Actualizar usuarios CON sesión activa
-- ============================================
-- Usuarios que tienen una entrada en active_sessions con expires_at futuro

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_operativo}',
  'true'::jsonb
)
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM active_sessions 
  WHERE expires_at > NOW()
);

-- Log de usuarios actualizados a ONLINE
DO $$
DECLARE
  online_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO online_count
  FROM active_sessions 
  WHERE expires_at > NOW();
  
  RAISE NOTICE '✅ Usuarios marcados como EN LÍNEA (is_operativo = true): %', online_count;
END $$;

-- ============================================
-- PASO 2: Actualizar usuarios SIN sesión activa
-- ============================================
-- Todos los demás usuarios (sin sesión o con sesión expirada)

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_operativo}',
  'false'::jsonb
)
WHERE id NOT IN (
  SELECT DISTINCT user_id 
  FROM active_sessions 
  WHERE expires_at > NOW()
);

-- Log de usuarios actualizados a OFFLINE
DO $$
DECLARE
  offline_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO offline_count
  FROM auth.users
  WHERE id NOT IN (
    SELECT DISTINCT user_id 
    FROM active_sessions 
    WHERE expires_at > NOW()
  );
  
  RAISE NOTICE '✅ Usuarios marcados como DESCONECTADOS (is_operativo = false): %', offline_count;
END $$;

-- ============================================
-- PASO 3: Mostrar resumen de sesiones activas
-- ============================================

DO $$
DECLARE
  active_sessions_count INTEGER;
  active_users_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_sessions_count
  FROM active_sessions
  WHERE expires_at > NOW();
  
  SELECT COUNT(DISTINCT user_id) INTO active_users_count
  FROM active_sessions
  WHERE expires_at > NOW();
  
  RAISE NOTICE '📊 RESUMEN:';
  RAISE NOTICE '  - Sesiones activas totales: %', active_sessions_count;
  RAISE NOTICE '  - Usuarios únicos con sesión: %', active_users_count;
END $$;

-- ============================================
-- PASO 4: Mostrar detalle de usuarios conectados
-- ============================================

DO $$
DECLARE
  user_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '👥 USUARIOS CONECTADOS:';
  RAISE NOTICE '  %-40s | %-30s | %-20s', 'Email', 'Nombre', 'Última Actividad';
  RAISE NOTICE '  %', repeat('-', 95);
  
  FOR user_record IN
    SELECT 
      u.email,
      COALESCE(u.raw_user_meta_data->>'full_name', 'Sin nombre') as full_name,
      TO_CHAR(s.last_activity, 'DD/MM/YYYY HH24:MI:SS') as last_activity
    FROM auth.users u
    INNER JOIN active_sessions s ON u.id = s.user_id
    WHERE s.expires_at > NOW()
    ORDER BY s.last_activity DESC
  LOOP
    RAISE NOTICE '  %-40s | %-30s | %-20s', 
      user_record.email, 
      user_record.full_name,
      user_record.last_activity;
  END LOOP;
  
  IF NOT FOUND THEN
    RAISE NOTICE '  (No hay usuarios conectados actualmente)';
  END IF;
END $$;

COMMIT;

-- ============================================
-- NOTAS:
-- ============================================
-- 
-- Este script puede ejecutarse manualmente cuando se necesite
-- sincronizar el estado de is_operativo con las sesiones reales.
--
-- Para automatizar esto, se podría crear un CRON job que ejecute
-- este script periódicamente (cada 5-10 minutos).
--
