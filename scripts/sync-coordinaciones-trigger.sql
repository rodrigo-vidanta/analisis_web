-- ============================================
-- TRIGGER: Sincronización Automática auth_user_coordinaciones → auth.users metadata
-- ============================================
-- 
-- Propósito: Mantener sincronizado coordinacion_id entre:
--   1. auth_user_coordinaciones (tabla relacional, fuente de verdad)
--   2. auth.users.raw_user_meta_data (metadata para user_profiles_v2)
-- 
-- Comportamiento:
--   - INSERT/UPDATE/DELETE en auth_user_coordinaciones → actualiza metadata
--   - Usa la PRIMERA coordinación (ordenada por assigned_at)
--   - Si no hay coordinaciones, establece NULL en metadata
-- 
-- Fecha: 2026-01-22
-- ============================================

-- Función que sincroniza coordinacion_id a metadata
CREATE OR REPLACE FUNCTION sync_coordinacion_id_to_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_metadata JSONB;
  v_coordinacion_id UUID;
  v_user_id UUID;
BEGIN
  -- Determinar user_id según operación (INSERT/UPDATE/DELETE)
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Obtener la PRIMERA coordinación del usuario (para metadata)
  -- Prioriza las más antiguas (assigned_at ASC)
  SELECT coordinacion_id INTO v_coordinacion_id
  FROM auth_user_coordinaciones
  WHERE user_id = v_user_id
  ORDER BY assigned_at ASC NULLS LAST
  LIMIT 1;
  
  -- Obtener metadata actual del usuario
  SELECT raw_user_meta_data INTO v_metadata
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Si no hay metadata (usuario sin configurar), crear objeto vacío
  IF v_metadata IS NULL THEN
    v_metadata := '{}'::jsonb;
  END IF;
  
  -- Actualizar coordinacion_id en metadata
  IF v_coordinacion_id IS NOT NULL THEN
    v_metadata := jsonb_set(v_metadata, '{coordinacion_id}', to_jsonb(v_coordinacion_id::TEXT));
  ELSE
    -- Si no hay coordinaciones, remover la key o establecer null
    v_metadata := v_metadata - 'coordinacion_id';
    -- Alternativamente, establecer null:
    -- v_metadata := jsonb_set(v_metadata, '{coordinacion_id}', 'null'::jsonb);
  END IF;
  
  -- Actualizar metadata en auth.users
  UPDATE auth.users
  SET raw_user_meta_data = v_metadata,
      updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ [sync_coordinacion] Usuario %: coordinacion_id actualizada a %', v_user_id, v_coordinacion_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger AFTER INSERT: cuando se agrega una nueva coordinación
DROP TRIGGER IF EXISTS sync_coordinacion_after_insert ON auth_user_coordinaciones;
CREATE TRIGGER sync_coordinacion_after_insert
AFTER INSERT ON auth_user_coordinaciones
FOR EACH ROW EXECUTE FUNCTION sync_coordinacion_id_to_metadata();

-- Trigger AFTER UPDATE: cuando se modifica una coordinación existente
DROP TRIGGER IF EXISTS sync_coordinacion_after_update ON auth_user_coordinaciones;
CREATE TRIGGER sync_coordinacion_after_update
AFTER UPDATE ON auth_user_coordinaciones
FOR EACH ROW EXECUTE FUNCTION sync_coordinacion_id_to_metadata();

-- Trigger AFTER DELETE: cuando se elimina una coordinación
DROP TRIGGER IF EXISTS sync_coordinacion_after_delete ON auth_user_coordinaciones;
CREATE TRIGGER sync_coordinacion_after_delete
AFTER DELETE ON auth_user_coordinaciones
FOR EACH ROW EXECUTE FUNCTION sync_coordinacion_id_to_metadata();

-- ============================================
-- VERIFICACIÓN: Comprobar que los triggers están activos
-- ============================================
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'auth_user_coordinaciones'
ORDER BY trigger_name;

-- ============================================
-- TEST: Probar sincronización (OPCIONAL - EJECUTAR SOLO EN DEV)
-- ============================================
-- NOTA: Este test solo debe ejecutarse en ambiente de desarrollo
-- Descomentar solo si quieres validar el funcionamiento

/*
DO $$
DECLARE
  v_test_user_id UUID;
  v_test_coord_id UUID;
  v_metadata JSONB;
BEGIN
  -- Crear usuario de prueba
  INSERT INTO auth.users (
    instance_id,
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'test-sync-' || EXTRACT(EPOCH FROM NOW()) || '@test.com',
    crypt('test123', gen_salt('bf')),
    NOW(),
    '{"full_name": "Test Sync User"}'::jsonb,
    NOW(),
    NOW()
  ) RETURNING id INTO v_test_user_id;
  
  RAISE NOTICE '📝 Usuario de prueba creado: %', v_test_user_id;
  
  -- Obtener una coordinación existente
  SELECT id INTO v_test_coord_id FROM coordinaciones LIMIT 1;
  
  IF v_test_coord_id IS NULL THEN
    RAISE EXCEPTION 'No hay coordinaciones en la base de datos para realizar el test';
  END IF;
  
  -- TEST 1: INSERT - Insertar coordinación
  RAISE NOTICE '🧪 TEST 1: INSERT coordinación';
  INSERT INTO auth_user_coordinaciones (user_id, coordinacion_id, assigned_at)
  VALUES (v_test_user_id, v_test_coord_id, NOW());
  
  -- Verificar metadata
  SELECT raw_user_meta_data INTO v_metadata
  FROM auth.users
  WHERE id = v_test_user_id;
  
  IF (v_metadata->>'coordinacion_id')::UUID = v_test_coord_id THEN
    RAISE NOTICE '✅ TEST 1 PASSED: coordinacion_id sincronizada correctamente';
  ELSE
    RAISE EXCEPTION '❌ TEST 1 FAILED: coordinacion_id NO se sincronizó';
  END IF;
  
  -- TEST 2: DELETE - Eliminar coordinación
  RAISE NOTICE '🧪 TEST 2: DELETE coordinación';
  DELETE FROM auth_user_coordinaciones
  WHERE user_id = v_test_user_id AND coordinacion_id = v_test_coord_id;
  
  -- Verificar que se removió de metadata
  SELECT raw_user_meta_data INTO v_metadata
  FROM auth.users
  WHERE id = v_test_user_id;
  
  IF v_metadata->>'coordinacion_id' IS NULL THEN
    RAISE NOTICE '✅ TEST 2 PASSED: coordinacion_id removida correctamente';
  ELSE
    RAISE EXCEPTION '❌ TEST 2 FAILED: coordinacion_id NO se removió';
  END IF;
  
  -- Cleanup: Eliminar usuario de prueba
  DELETE FROM auth.users WHERE id = v_test_user_id;
  RAISE NOTICE '🧹 Usuario de prueba eliminado';
  
  RAISE NOTICE '✅ TODOS LOS TESTS PASARON';
END $$;
*/

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- 1. Este trigger SOLO actualiza metadata cuando cambia auth_user_coordinaciones
-- 2. NO afecta las operaciones CRUD normales de usuarios
-- 3. Es SEGURO para producción (no hace cambios destructivos)
-- 4. Si un coordinador tiene múltiples coordinaciones, usa la primera (assigned_at ASC)
-- 5. La función usa SECURITY DEFINER para tener permisos sobre auth.users
-- 6. Los triggers son AFTER (no bloquean la operación original)
-- 
-- ============================================
