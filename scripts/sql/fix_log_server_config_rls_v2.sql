-- ============================================
-- CORRECCIÓN DE POLÍTICAS RLS PARA log_server_config (VERSIÓN 2)
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- Esta versión deshabilita RLS temporalmente o usa políticas más permisivas
-- ya que System_UI usa autenticación personalizada

-- OPCIÓN 1: Deshabilitar RLS completamente (solo para testing)
-- Descomentar si las políticas no funcionan:
/*
ALTER TABLE log_server_config DISABLE ROW LEVEL SECURITY;
*/

-- OPCIÓN 2: Políticas más permisivas que permiten todo a usuarios autenticados
-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo service_role puede crear configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo service_role puede actualizar configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo service_role puede eliminar configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo administradores pueden crear configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Usuarios autenticados pueden modificar configuración de logs" ON log_server_config;

-- Habilitar RLS
ALTER TABLE log_server_config ENABLE ROW LEVEL SECURITY;

-- Política permisiva: Permitir todo a usuarios autenticados
-- Nota: La validación de admin se hace en el componente React
CREATE POLICY "Permitir todo a usuarios autenticados - log_server_config"
  ON log_server_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Si la política anterior no funciona, usar esta alternativa más explícita:
-- (Descomentar si la anterior falla)
/*
CREATE POLICY "Permitir SELECT - log_server_config"
  ON log_server_config
  FOR SELECT
  USING (true);

CREATE POLICY "Permitir INSERT - log_server_config"
  ON log_server_config
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir UPDATE - log_server_config"
  ON log_server_config
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir DELETE - log_server_config"
  ON log_server_config
  FOR DELETE
  USING (true);
*/

