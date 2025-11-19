-- ============================================
-- TRIGGERS Y AUTOMATIZACIÓN PARA ASIGNACIÓN
-- Base de datos: glsmifhkoaifvaegsozd.supabase.co (Análisis)
-- ============================================
--
-- ⚠️ IMPORTANTE:
-- Estos triggers se ejecutan en la base de análisis
-- y llaman funciones RPC en System_UI
-- ============================================

-- ============================================
-- 1. FUNCIÓN: Asignar prospecto automáticamente cuando se crea
-- ============================================
CREATE OR REPLACE FUNCTION auto_assign_new_prospect()
RETURNS TRIGGER AS $$
DECLARE
  v_coordinacion_id UUID;
BEGIN
  -- Solo asignar si no tiene coordinacion_id
  IF NEW.coordinacion_id IS NULL THEN
    -- Llamar función RPC en System_UI para asignación automática
    -- NOTA: Esto requiere Foreign Data Wrapper o llamada HTTP
    -- Por ahora, se manejará desde el servicio de aplicación
    
    -- Marcar para asignación (se procesará por servicio externo)
    -- NEW.needs_assignment = true;
    
    RAISE NOTICE 'Nuevo prospecto creado: % - Requiere asignación automática', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para nuevos prospectos
DROP TRIGGER IF EXISTS trigger_auto_assign_new_prospect ON prospectos;
CREATE TRIGGER trigger_auto_assign_new_prospect
  AFTER INSERT ON prospectos
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_new_prospect();

-- ============================================
-- 2. FUNCIÓN: Asignar a ejecutivo cuando obtiene ID CRM
-- ============================================
CREATE OR REPLACE FUNCTION auto_assign_prospect_with_crm()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si ahora tiene id_dynamics y antes no lo tenía
  IF NEW.id_dynamics IS NOT NULL AND NEW.id_dynamics != '' AND 
     (OLD.id_dynamics IS NULL OR OLD.id_dynamics = '') THEN
    
    -- Verificar que tenga coordinacion_id pero no ejecutivo_id
    IF NEW.coordinacion_id IS NOT NULL AND NEW.ejecutivo_id IS NULL THEN
      RAISE NOTICE 'Prospecto % obtuvo ID CRM: % - Requiere asignación a ejecutivo', NEW.id, NEW.id_dynamics;
      
      -- Marcar para asignación a ejecutivo (se procesará por servicio externo)
      -- NEW.needs_ejecutivo_assignment = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para cuando se actualiza id_dynamics
DROP TRIGGER IF EXISTS trigger_auto_assign_prospect_with_crm ON prospectos;
CREATE TRIGGER trigger_auto_assign_prospect_with_crm
  AFTER UPDATE OF id_dynamics ON prospectos
  FOR EACH ROW
  WHEN (NEW.id_dynamics IS DISTINCT FROM OLD.id_dynamics)
  EXECUTE FUNCTION auto_assign_prospect_with_crm();

-- ============================================
-- 3. FUNCIÓN: Asignar llamada según prospecto
-- ============================================
CREATE OR REPLACE FUNCTION auto_assign_call_to_coordinacion()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la llamada tiene un prospecto asociado
  IF NEW.prospecto IS NOT NULL THEN
    -- Obtener coordinacion_id del prospecto
    SELECT coordinacion_id INTO NEW.coordinacion_id
    FROM prospectos
    WHERE id = NEW.prospecto;
    
    -- Si el prospecto tiene ejecutivo asignado, asignar también la llamada
    IF NEW.coordinacion_id IS NOT NULL THEN
      SELECT ejecutivo_id INTO NEW.ejecutivo_id
      FROM prospectos
      WHERE id = NEW.prospecto;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para nuevas llamadas
DROP TRIGGER IF EXISTS trigger_auto_assign_call ON llamadas_ventas;
CREATE TRIGGER trigger_auto_assign_call
  BEFORE INSERT ON llamadas_ventas
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_call_to_coordinacion();

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- NOTAS IMPORTANTES:
-- 1. Los triggers de asignación automática requieren comunicación entre bases de datos
-- 2. La mejor práctica es usar servicios de aplicación que llamen a las funciones RPC
-- 3. Los triggers aquí solo marcan o sincronizan campos locales
-- 4. La asignación real se hace desde los servicios TypeScript llamando a las funciones RPC

