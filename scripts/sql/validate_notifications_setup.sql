-- ============================================
-- SCRIPT DE VALIDACIÓN - SISTEMA DE NOTIFICACIONES
-- ============================================
-- Ejecutar este script en SYSTEM_UI (zbylezfyagwrxoecioup.supabase.co)
-- para validar que todo está configurado correctamente

-- 1. Verificar que la tabla user_notifications existe
SELECT 
  '✅ Tabla user_notifications existe' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_notifications';

-- 2. Verificar estructura de columnas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_notifications'
ORDER BY ordinal_position;

-- 3. Verificar que las funciones están creadas
SELECT 
  '✅ Funciones de notificaciones' as status,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%notification%'
ORDER BY routine_name;

-- 4. Verificar índices
SELECT 
  '✅ Índices creados' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications'
ORDER BY indexname;

-- 5. Verificar políticas RLS
SELECT 
  '✅ Políticas RLS' as status,
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_notifications'
ORDER BY policyname;

-- 6. Verificar triggers (debería estar vacío, no usamos triggers)
SELECT 
  'ℹ️ Triggers' as status,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
  AND event_object_table = 'user_notifications';

-- 7. Verificar que la tabla auth_users existe (requerida para foreign key)
SELECT 
  '✅ Tabla auth_users existe (requerida)' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'auth_users';

-- 8. Resumen final
SELECT 
  '📊 RESUMEN' as section,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_notifications') as columnas_en_tabla,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%notification%') as funciones_creadas,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'user_notifications') as indices_creados,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notifications') as politicas_rls;

-- 9. Prueba de inserción (solo si hay usuarios en auth_users)
-- Descomentar para probar:
/*
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Obtener un usuario de prueba
  SELECT id INTO test_user_id FROM auth_users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Intentar insertar una notificación de prueba
    INSERT INTO user_notifications (
      user_id,
      notification_type,
      module,
      message_id,
      conversation_id,
      prospect_id,
      customer_name,
      customer_phone,
      message_preview,
      is_read,
      is_muted
    ) VALUES (
      test_user_id,
      'new_message',
      'live-chat',
      gen_random_uuid(),
      gen_random_uuid(),
      gen_random_uuid(),
      'Usuario de Prueba',
      '+521234567890',
      'Mensaje de prueba para validar el sistema',
      false,
      false
    );
    
    RAISE NOTICE '✅ Inserción de prueba exitosa';
    
    -- Limpiar la notificación de prueba
    DELETE FROM user_notifications 
    WHERE customer_name = 'Usuario de Prueba' 
      AND message_preview = 'Mensaje de prueba para validar el sistema';
    
    RAISE NOTICE '✅ Notificación de prueba eliminada';
  ELSE
    RAISE NOTICE '⚠️ No hay usuarios en auth_users para probar';
  END IF;
END $$;
*/

-- 10. Verificar funciones específicas requeridas
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'create_message_notifications_batch'
    ) THEN '✅ create_message_notifications_batch existe'
    ELSE '❌ create_message_notifications_batch NO existe'
  END as funcion_1,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'create_call_notifications_batch'
    ) THEN '✅ create_call_notifications_batch existe'
    ELSE '❌ create_call_notifications_batch NO existe'
  END as funcion_2,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'mark_message_notifications_as_read'
    ) THEN '✅ mark_message_notifications_as_read existe'
    ELSE '❌ mark_message_notifications_as_read NO existe'
  END as funcion_3,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'mark_call_notifications_as_read'
    ) THEN '✅ mark_call_notifications_as_read existe'
    ELSE '❌ mark_call_notifications_as_read NO existe'
  END as funcion_4;

