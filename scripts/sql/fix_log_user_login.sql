-- ============================================
-- CORRECCIÓN DE FUNCIÓN log_user_login
-- ============================================
-- Problema: Error de tipos boolean > integer
-- Solución: Usar variable intermedia INTEGER para COUNT
-- Base de datos: System UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- EJECUTAR EN: Supabase Dashboard > System UI > SQL Editor
-- ============================================

-- Eliminar función existente con todas sus variantes
DROP FUNCTION IF EXISTS log_user_login(UUID, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS log_user_login(UUID, VARCHAR, VARCHAR, VARCHAR, TEXT, VARCHAR);
DROP FUNCTION IF EXISTS public.log_user_login CASCADE;

-- Crear función corregida
-- IMPORTANTE: Parámetros obligatorios primero, opcionales al final
CREATE OR REPLACE FUNCTION log_user_login(
  p_email VARCHAR(255),
  p_ip_address VARCHAR(45),
  p_user_agent TEXT,
  p_login_status VARCHAR(20),
  p_user_id UUID DEFAULT NULL,
  p_session_token VARCHAR(255) DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_device_type VARCHAR(50);
  v_browser VARCHAR(100);
  v_browser_version VARCHAR(50);
  v_os VARCHAR(100);
  v_os_version VARCHAR(50);
  v_is_suspicious BOOLEAN := false;
  v_suspicious_reasons TEXT[] := ARRAY[]::TEXT[];
  v_ip_count INTEGER := 0; -- Variable intermedia para COUNT
BEGIN
  -- Parsear user agent (simplificado)
  IF p_user_agent LIKE '%Mobile%' OR p_user_agent LIKE '%Android%' OR p_user_agent LIKE '%iPhone%' THEN
    v_device_type := 'mobile';
  ELSIF p_user_agent LIKE '%Tablet%' OR p_user_agent LIKE '%iPad%' THEN
    v_device_type := 'tablet';
  ELSE
    v_device_type := 'desktop';
  END IF;

  -- Extraer información básica del navegador
  IF p_user_agent LIKE '%Chrome%' AND p_user_agent NOT LIKE '%Edge%' THEN
    v_browser := 'Chrome';
  ELSIF p_user_agent LIKE '%Firefox%' THEN
    v_browser := 'Firefox';
  ELSIF p_user_agent LIKE '%Safari%' AND p_user_agent NOT LIKE '%Chrome%' THEN
    v_browser := 'Safari';
  ELSIF p_user_agent LIKE '%Edge%' THEN
    v_browser := 'Edge';
  ELSE
    v_browser := 'Unknown';
  END IF;

  -- Detectar actividad sospechosa básica
  IF p_login_status = 'success' AND p_user_id IS NOT NULL THEN
    -- Verificar si hay múltiples logins desde IPs diferentes en las últimas 2 horas
    SELECT COUNT(DISTINCT ip_address) INTO v_ip_count
    FROM auth_login_logs
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '2 hours'
      AND login_status = 'success'
      AND ip_address IS DISTINCT FROM p_ip_address;
    
    -- Convertir COUNT a BOOLEAN
    IF v_ip_count > 0 THEN
      v_is_suspicious := true;
      v_suspicious_reasons := ARRAY['Multiple IP addresses in short time'];
    END IF;
  END IF;

  -- Insertar log
  INSERT INTO auth_login_logs (
    user_id, email, session_token, ip_address, user_agent,
    device_type, browser, browser_version, os, os_version,
    login_status, failure_reason, expires_at, is_suspicious, suspicious_reasons
  ) VALUES (
    p_user_id, p_email, p_session_token, p_ip_address, p_user_agent,
    v_device_type, v_browser, v_browser_version, 'Unknown', 'Unknown',
    p_login_status, p_failure_reason, p_expires_at, v_is_suspicious, v_suspicious_reasons
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_user_login IS 'Registra un intento de login con información detallada. Corregido error de tipos boolean > integer.';

