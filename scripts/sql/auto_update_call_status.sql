-- TRIGGER PARA ACTUALIZAR call_status AUTOMÁTICAMENTE
-- Cuando endcallreport actualiza duracion_segundos + audio_ruta_bucket
-- Automáticamente cambia call_status de 'activa' a 'finalizada'

CREATE OR REPLACE FUNCTION auto_update_call_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la llamada tiene duración Y grabación, marcarla como finalizada
  IF NEW.duracion_segundos > 0 AND 
     NEW.audio_ruta_bucket IS NOT NULL AND 
     NEW.audio_ruta_bucket != '' AND
     NEW.call_status = 'activa' THEN
    
    NEW.call_status = 'finalizada';
    
    -- Log para debugging
    RAISE NOTICE 'Auto-actualizando call_status: % → finalizada (duración: %s, grabación: %)', 
                 NEW.call_id, NEW.duracion_segundos, 
                 CASE WHEN NEW.audio_ruta_bucket IS NOT NULL THEN 'SÍ' ELSE 'NO' END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta ANTES de UPDATE
DROP TRIGGER IF EXISTS trigger_auto_update_call_status ON llamadas_ventas;

CREATE TRIGGER trigger_auto_update_call_status
  BEFORE UPDATE ON llamadas_ventas
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_call_status();

-- Comentario explicativo
COMMENT ON FUNCTION auto_update_call_status() IS 
'Actualiza automáticamente call_status a "finalizada" cuando endcallreport 
 agrega duracion_segundos + audio_ruta_bucket a una llamada activa';

COMMENT ON TRIGGER trigger_auto_update_call_status ON llamadas_ventas IS
'Trigger que detecta cuando webhook endcallreport completa los datos 
 de una llamada y automáticamente cambia el status a finalizada';

-- Verificar que el trigger se creó correctamente
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_update_call_status';
