-- ============================================
-- MODIFICACIONES A TABLAS EXISTENTES
-- Para soportar sistema de coordinaciones
-- ============================================
--
-- ⚠️ IMPORTANTE:
-- Este script modifica tablas en MÚLTIPLES bases de datos
-- Ejecutar cada sección en la base de datos correspondiente
-- ============================================

-- ============================================
-- SECCIÓN 1: BASE DE ANÁLISIS
-- Base: glsmifhkoaifvaegsozd.supabase.co
-- Tablas: prospectos, llamadas_ventas
-- ============================================

-- ============================================
-- 1.1. MODIFICAR TABLA: prospectos
-- ============================================
-- Ejecutar en: glsmifhkoaifvaegsozd.supabase.co

ALTER TABLE prospectos 
ADD COLUMN IF NOT EXISTS coordinacion_id UUID,
ADD COLUMN IF NOT EXISTS ejecutivo_id UUID,
ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMP WITH TIME ZONE;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_prospectos_coordinacion ON prospectos(coordinacion_id) WHERE coordinacion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospectos_ejecutivo ON prospectos(ejecutivo_id) WHERE ejecutivo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospectos_assignment_date ON prospectos(assignment_date) WHERE assignment_date IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN prospectos.coordinacion_id IS 'ID de la coordinación asignada (referencia a System_UI.coordinaciones)';
COMMENT ON COLUMN prospectos.ejecutivo_id IS 'ID del ejecutivo asignado (referencia a System_UI.auth_users)';
COMMENT ON COLUMN prospectos.assignment_date IS 'Fecha de asignación a coordinación o ejecutivo';

-- NOTA: id_dynamics ya existe y es el ID de CRM

-- ============================================
-- 1.2. MODIFICAR TABLA: llamadas_ventas
-- ============================================
-- Ejecutar en: glsmifhkoaifvaegsozd.supabase.co

ALTER TABLE llamadas_ventas
ADD COLUMN IF NOT EXISTS coordinacion_id UUID,
ADD COLUMN IF NOT EXISTS ejecutivo_id UUID;

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_llamadas_coordinacion ON llamadas_ventas(coordinacion_id) WHERE coordinacion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_llamadas_ejecutivo ON llamadas_ventas(ejecutivo_id) WHERE ejecutivo_id IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN llamadas_ventas.coordinacion_id IS 'ID de la coordinación asignada (referencia a System_UI.coordinaciones)';
COMMENT ON COLUMN llamadas_ventas.ejecutivo_id IS 'ID del ejecutivo asignado (referencia a System_UI.auth_users)';

-- ============================================
-- SECCIÓN 2: SYSTEM_UI
-- Base: zbylezfyagwrxoecioup.supabase.co
-- Tablas: uchat_conversations
-- ============================================

-- ============================================
-- 2.1. MODIFICAR TABLA: uchat_conversations
-- ============================================
-- Ejecutar en: zbylezfyagwrxoecioup.supabase.co

ALTER TABLE uchat_conversations
ADD COLUMN IF NOT EXISTS coordinacion_id UUID REFERENCES coordinaciones(id),
ADD COLUMN IF NOT EXISTS ejecutivo_id UUID REFERENCES auth_users(id);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_uchat_conv_coordinacion ON uchat_conversations(coordinacion_id) WHERE coordinacion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uchat_conv_ejecutivo ON uchat_conversations(ejecutivo_id) WHERE ejecutivo_id IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN uchat_conversations.coordinacion_id IS 'ID de la coordinación asignada';
COMMENT ON COLUMN uchat_conversations.ejecutivo_id IS 'ID del ejecutivo asignado';

-- ============================================
-- SECCIÓN 3: FUNCIONES DE SINCRONIZACIÓN
-- ============================================
-- Estas funciones ayudan a mantener sincronizadas las asignaciones
-- entre System_UI y la base de análisis

-- ============================================
-- 3.1. FUNCIÓN: Sincronizar coordinacion_id en prospectos
-- ============================================
-- Ejecutar en: glsmifhkoaifvaegsozd.supabase.co
-- NOTA: Esta función requiere acceso a System_UI via Foreign Data Wrapper
-- Por ahora, se puede llamar desde el servicio de aplicación

-- Función auxiliar para actualizar coordinacion_id en prospectos
-- Se llamará desde el servicio cuando se asigne un prospecto
CREATE OR REPLACE FUNCTION update_prospecto_coordinacion(
  p_prospect_id UUID,
  p_coordinacion_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE prospectos
  SET coordinacion_id = p_coordinacion_id,
      assignment_date = NOW()
  WHERE id = p_prospect_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_prospecto_coordinacion IS 'Actualiza el coordinacion_id en la tabla prospectos cuando se asigna desde System_UI';

-- ============================================
-- 3.2. FUNCIÓN: Sincronizar ejecutivo_id en prospectos
-- ============================================
-- Ejecutar en: glsmifhkoaifvaegsozd.supabase.co

CREATE OR REPLACE FUNCTION update_prospecto_ejecutivo(
  p_prospect_id UUID,
  p_ejecutivo_id UUID
)
RETURNS void AS $$
BEGIN
  UPDATE prospectos
  SET ejecutivo_id = p_ejecutivo_id,
      assignment_date = NOW()
  WHERE id = p_prospect_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_prospecto_ejecutivo IS 'Actualiza el ejecutivo_id en la tabla prospectos cuando se asigna desde System_UI';

-- ============================================
-- SECCIÓN 4: TRIGGERS (OPCIONAL)
-- ============================================
-- Estos triggers pueden ayudar a mantener sincronización automática
-- pero requieren configuración adicional de Foreign Data Wrapper
-- Por ahora, la sincronización se hará desde los servicios de aplicación

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- NOTAS IMPORTANTES:
-- 1. Los campos coordinacion_id y ejecutivo_id en prospectos y llamadas_ventas
--    NO tienen FOREIGN KEY porque referencian tablas en otra base de datos (System_UI)
-- 2. La sincronización se hará desde los servicios de aplicación TypeScript
-- 3. Los índices se crean solo donde los campos no son NULL para optimizar espacio
-- 4. Las funciones de sincronización se pueden llamar desde los servicios cuando
--    se asignen prospectos desde System_UI

