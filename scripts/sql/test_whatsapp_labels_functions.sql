-- ============================================
-- TEST: Verificar que las funciones RPC existan
-- Base: SYSTEM_UI (zbylezfyagwrxoecioup)
-- ============================================

-- 1. Verificar que las tablas existan
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'whatsapp_labels%'
ORDER BY table_name;

-- 2. Verificar que las funciones RPC existan
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%label%'
ORDER BY routine_name;

-- 3. Verificar políticas RLS
SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename LIKE 'whatsapp_labels%'
ORDER BY tablename, policyname;

-- 4. Verificar que existan etiquetas preset
SELECT id, name, color FROM whatsapp_labels_preset WHERE is_active = true;

-- 5. Test de inserción directa (verificar permisos)
-- Nota: Reemplaza USER_ID_AQUI con tu user ID real
/*
INSERT INTO whatsapp_conversation_labels (
  prospecto_id,
  label_id,
  label_type,
  shadow_cell,
  added_by
) VALUES (
  'eb172dc1-7385-4a0f-9693-96383bb736fc', -- ID de prospecto de prueba
  (SELECT id FROM whatsapp_labels_preset WHERE name = 'Nuevo Lead' LIMIT 1),
  'preset',
  false,
  'USER_ID_AQUI'
) RETURNING *;
*/

