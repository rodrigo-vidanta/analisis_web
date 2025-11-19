-- ============================================
-- CORRECCIÓN DE POLÍTICAS RLS PARA log_server_config
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- Este script corrige las políticas RLS para permitir que usuarios autenticados
-- puedan modificar la configuración del log server
-- Nota: La validación de admin se hace en el componente React, no en RLS

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo service_role puede crear configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo service_role puede actualizar configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo service_role puede eliminar configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo administradores pueden crear configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Solo administradores pueden eliminar configuración de logs" ON log_server_config;
DROP POLICY IF EXISTS "Usuarios autenticados pueden modificar configuración de logs" ON log_server_config;

-- Política para lectura: Todos los usuarios autenticados pueden leer
CREATE POLICY "Usuarios autenticados pueden leer configuración de logs"
  ON log_server_config
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política para inserción/actualización/eliminación: Usuarios autenticados pueden modificar
-- La validación de que sea admin se hace en el componente React antes de llamar a esta función
CREATE POLICY "Usuarios autenticados pueden modificar configuración de logs"
  ON log_server_config
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

