-- ============================================
-- CREAR TABLA active_sessions
-- ============================================
-- 
-- Fecha: 30 Enero 2026
-- Propósito: Rastrear sesiones activas con heartbeat
--
-- Esta tabla permite:
-- 1. Detectar usuarios realmente conectados
-- 2. Limpiar sesiones inactivas automáticamente
-- 3. Implementar sistema de heartbeat
--
-- ============================================

-- Crear tabla de sesiones activas
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  device_info JSONB DEFAULT '{}'::jsonb,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: Un usuario solo puede tener una sesión activa
  CONSTRAINT unique_user_session UNIQUE (user_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_session_id ON active_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity ON active_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions(expires_at);

-- Índice compuesto para queries de limpieza (sin predicado NOW() para evitar error de inmutabilidad)
CREATE INDEX IF NOT EXISTS idx_active_sessions_cleanup 
  ON active_sessions(last_activity, expires_at);

-- RLS: Deshabilitar para permitir acceso con anon_key
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver y actualizar solo su propia sesión
CREATE POLICY "Users can view own session" ON active_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session" ON active_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own session" ON active_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own session" ON active_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Política: Service role tiene acceso completo (para Edge Functions)
CREATE POLICY "Service role has full access" ON active_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Función para limpiar sesiones expiradas o inactivas
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar sesiones que:
  -- 1. Han expirado (expires_at < NOW())
  -- 2. O llevan más de 2 minutos sin actividad (last_activity < NOW() - INTERVAL '2 minutes')
  
  DELETE FROM active_sessions
  WHERE expires_at < NOW()
     OR last_activity < NOW() - INTERVAL '2 minutes';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Actualizar is_operativo = false para usuarios sin sesión activa
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{is_operativo}',
    'false'::jsonb
  )
  WHERE id NOT IN (
    SELECT user_id FROM active_sessions WHERE expires_at > NOW()
  )
  AND COALESCE(raw_user_meta_data->>'is_operativo', 'false')::boolean = true;
  
  RETURN deleted_count;
END;
$$;

-- Comentarios para documentación
COMMENT ON TABLE active_sessions IS 'Rastreo de sesiones activas con heartbeat';
COMMENT ON COLUMN active_sessions.user_id IS 'Usuario propietario de la sesión';
COMMENT ON COLUMN active_sessions.session_id IS 'ID único de la sesión';
COMMENT ON COLUMN active_sessions.device_info IS 'Información del dispositivo (browser, OS, etc)';
COMMENT ON COLUMN active_sessions.last_activity IS 'Última actividad registrada (actualizado por heartbeat)';
COMMENT ON COLUMN active_sessions.expires_at IS 'Fecha de expiración de la sesión';
COMMENT ON FUNCTION cleanup_inactive_sessions IS 'Limpia sesiones inactivas y actualiza is_operativo';

-- ============================================
-- NOTAS DE USO:
-- ============================================
-- 
-- 1. Frontend actualiza last_activity cada 30 segundos via UPSERT
-- 2. Edge Function ejecuta cleanup_inactive_sessions() cada 1 minuto
-- 3. Sesiones inactivas > 2 minutos son eliminadas automáticamente
-- 4. Al eliminar sesión, is_operativo se pone en false
--
