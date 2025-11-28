/**
 * Script para ejecutar la corrección de log_user_login en System UI
 * Usa las credenciales del proyecto para conectarse directamente
 */

const SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

const SQL = `
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
`;

async function executeSQL() {
  try {
    console.log('🔄 Ejecutando corrección de función log_user_login...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ sql: SQL })
    });

    if (!response.ok) {
      // Intentar ejecutar directamente usando la API de PostgREST
      // Necesitamos usar el endpoint de SQL directo
      console.log('⚠️ Intentando método alternativo...');
      
      // Usar el endpoint de Supabase para ejecutar SQL directamente
      const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ query: SQL })
      });

      const result = await sqlResponse.text();
      console.log('Resultado:', result);
    } else {
      const result = await response.json();
      console.log('✅ Función corregida exitosamente:', result);
    }
  } catch (error) {
    console.error('❌ Error ejecutando SQL:', error);
    console.log('\n📋 Por favor ejecuta el SQL manualmente en el dashboard de Supabase:');
    console.log('   https://supabase.com/dashboard/project/zbylezfyagwrxoecioup/sql');
    console.log('\nSQL a ejecutar:');
    console.log(SQL);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executeSQL();
}

export { executeSQL, SQL };

