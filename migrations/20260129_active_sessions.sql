-- ============================================
-- MIGRACIÓN: Sistema de Sesión Única
-- ============================================
-- Fecha: 29 de Enero 2026
-- Propósito: Prevenir sesiones duplicadas (post-migración Auth nativo)
-- Compatible con: Supabase Auth nativo (JWT)

-- ============================================
-- 1. CREAR TABLA active_sessions
-- ============================================
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,  -- UUID generado en cliente
  device_info JSONB,                 -- { browser, os, timestamp }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- CONSTRAINT: Solo 1 sesión activa por usuario
  CONSTRAINT active_sessions_user_id_key UNIQUE(user_id)
);

COMMENT ON TABLE public.active_sessions IS 'Sesiones activas únicas por usuario (post Auth nativo)';
COMMENT ON COLUMN public.active_sessions.session_id IS 'UUID generado en cliente para identificar esta sesión';
COMMENT ON COLUMN public.active_sessions.device_info IS 'Información del dispositivo/navegador';
COMMENT ON COLUMN public.active_sessions.expires_at IS 'Timestamp de expiración (24h por defecto)';

-- ============================================
-- 2. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON public.active_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON public.active_sessions(session_id);

-- ============================================
-- 3. HABILITAR ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. POLÍTICAS RLS
-- ============================================

-- Política: Usuarios autenticados pueden leer su propia sesión
DROP POLICY IF EXISTS "Users can read own session" ON public.active_sessions;
CREATE POLICY "Users can read own session"
  ON public.active_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Service role tiene acceso completo (para Edge Functions)
DROP POLICY IF EXISTS "Service role full access" ON public.active_sessions;
CREATE POLICY "Service role full access"
  ON public.active_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Política: Usuarios pueden insertar/actualizar su propia sesión
-- (usado en registerUniqueSession desde cliente)
DROP POLICY IF EXISTS "Users can upsert own session" ON public.active_sessions;
CREATE POLICY "Users can upsert own session"
  ON public.active_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own session" ON public.active_sessions;
CREATE POLICY "Users can update own session"
  ON public.active_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Usuarios pueden eliminar su propia sesión (logout)
DROP POLICY IF EXISTS "Users can delete own session" ON public.active_sessions;
CREATE POLICY "Users can delete own session"
  ON public.active_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. FUNCIÓN: Limpieza de sesiones expiradas
-- ============================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.active_sessions
  WHERE expires_at < NOW()
  RETURNING id INTO deleted_count;
  
  RETURN COALESCE(deleted_count, 0);
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_sessions IS 'Elimina sesiones expiradas (ejecutar periódicamente)';

-- ============================================
-- 6. HABILITAR REALTIME EN LA TABLA
-- ============================================
-- Esto permite que los clientes escuchen cambios vía Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;

-- ============================================
-- 7. GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_sessions TO authenticated;
GRANT ALL ON public.active_sessions TO service_role;

-- ============================================
-- 8. VERIFICACIÓN
-- ============================================
DO $$
BEGIN
  -- Verificar que la tabla existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'active_sessions'
  ) THEN
    RAISE EXCEPTION 'ERROR: Tabla active_sessions no fue creada';
  END IF;
  
  -- Verificar constraint UNIQUE en user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'active_sessions_user_id_key'
      AND table_name = 'active_sessions'
      AND constraint_type = 'UNIQUE'
  ) THEN
    RAISE EXCEPTION 'ERROR: Constraint UNIQUE en user_id no fue creado';
  END IF;
  
  -- Verificar RLS habilitado
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'active_sessions'
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'ERROR: RLS no está habilitado en active_sessions';
  END IF;
  
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '✅ Tabla: active_sessions';
  RAISE NOTICE '✅ Políticas RLS: 5 políticas creadas';
  RAISE NOTICE '✅ Función: cleanup_expired_sessions()';
  RAISE NOTICE '✅ Realtime: Habilitado';
END $$;

-- ============================================
-- 9. EJEMPLO DE USO (TESTING)
-- ============================================
/*
-- Insertar sesión de prueba
INSERT INTO public.active_sessions (user_id, session_id, device_info, expires_at)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  gen_random_uuid()::TEXT,
  '{"browser": "Chrome", "os": "macOS"}'::JSONB,
  NOW() + INTERVAL '24 hours'
);

-- Listar sesiones activas
SELECT * FROM public.active_sessions ORDER BY created_at DESC;

-- Limpiar sesiones expiradas
SELECT public.cleanup_expired_sessions();

-- Verificar Realtime
-- En cliente JS: supabase.channel('session_XXX').on('postgres_changes', ...)
*/
