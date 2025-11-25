-- ============================================
-- BLOQUEO TEMPORAL: Prevenir UPDATEs que cambian leido a true
-- ============================================

-- 1. Función que BLOQUEA cambios de false a true
CREATE OR REPLACE FUNCTION fn_prevent_leido_true_update_v3()
RETURNS TRIGGER AS $$
BEGIN
  -- ⚠️ BLOQUEAR cambios de false/null a true
  IF (OLD.leido IS FALSE OR OLD.leido IS NULL) AND NEW.leido IS TRUE THEN
    -- Registrar en auditoría
    INSERT INTO leido_change_audit (
      mensaje_id,
      old_leido,
      new_leido,
      operation_type,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.leido,
      NEW.leido,
      'UPDATE_BLOCKED',
      current_user
    );
    
    -- ⚠️ BLOQUEAR el cambio (revertir a false)
    NEW.leido = FALSE;
    
    -- Log para debugging
    RAISE NOTICE '⚠️ UPDATE bloqueado: Intento de cambiar leido a true para mensaje % revertido a false', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear/Reemplazar trigger BEFORE UPDATE
DROP TRIGGER IF EXISTS trg_prevent_leido_true ON mensajes_whatsapp;
CREATE TRIGGER trg_prevent_leido_true
BEFORE UPDATE ON mensajes_whatsapp
FOR EACH ROW
WHEN (OLD.leido IS DISTINCT FROM NEW.leido)
EXECUTE FUNCTION fn_prevent_leido_true_update_v3();

-- 3. Verificar que el trigger está activo
SELECT 
  tgname,
  CASE tgenabled
    WHEN 'O' THEN '✅ ENABLED'
    WHEN 'D' THEN '❌ DISABLED'
    ELSE '⚠️ OTHER'
  END as status
FROM pg_trigger 
WHERE tgrelid = 'mensajes_whatsapp'::regclass
  AND tgname = 'trg_prevent_leido_true';

-- 4. Probar el bloqueo
-- Intentar hacer un UPDATE manual (debería ser bloqueado)
UPDATE mensajes_whatsapp
SET leido = true
WHERE id = (SELECT id FROM mensajes_whatsapp WHERE leido = false LIMIT 1)
RETURNING id, mensaje, leido;

-- 5. Verificar que el UPDATE fue bloqueado
SELECT id, mensaje, leido
FROM mensajes_whatsapp
WHERE id = (SELECT id FROM mensajes_whatsapp WHERE leido = false LIMIT 1);

-- 6. Verificar la auditoría
SELECT 
  id,
  mensaje_id,
  old_leido,
  new_leido,
  changed_at,
  changed_by,
  operation_type
FROM leido_change_audit
WHERE operation_type = 'UPDATE_BLOCKED'
ORDER BY changed_at DESC
LIMIT 10;

