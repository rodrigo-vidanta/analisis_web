-- ============================================
-- FIX RLS MANUAL - EJECUTAR LÍNEA POR LÍNEA
-- Base: SYSTEM_UI (zbylezfyagwrxoecioup)
-- ============================================
--
-- INSTRUCCIONES:
-- 1. Ve a https://supabase.com/dashboard
-- 2. Proyecto: zbylezfyagwrxoecioup (SYSTEM_UI)
-- 3. SQL Editor → New Query
-- 4. Copia y pega LÍNEA POR LÍNEA (o grupos pequeños)
-- 5. Ejecuta cada grupo con Run
-- ============================================

-- PASO 1: Deshabilitar RLS
ALTER TABLE whatsapp_labels_custom DISABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar TODAS las políticas de whatsapp_labels_custom
DROP POLICY IF EXISTS "Usuarios pueden ver sus etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden crear etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS custom_select_policy ON whatsapp_labels_custom;
DROP POLICY IF EXISTS custom_insert_policy ON whatsapp_labels_custom;
DROP POLICY IF EXISTS custom_update_policy ON whatsapp_labels_custom;
DROP POLICY IF EXISTS custom_delete_policy ON whatsapp_labels_custom;
DROP POLICY IF EXISTS whatsapp_labels_custom_select ON whatsapp_labels_custom;
DROP POLICY IF EXISTS whatsapp_labels_custom_insert ON whatsapp_labels_custom;
DROP POLICY IF EXISTS whatsapp_labels_custom_update ON whatsapp_labels_custom;
DROP POLICY IF EXISTS whatsapp_labels_custom_delete ON whatsapp_labels_custom;
DROP POLICY IF EXISTS labels_custom_select_final ON whatsapp_labels_custom;
DROP POLICY IF EXISTS labels_custom_insert_final ON whatsapp_labels_custom;
DROP POLICY IF EXISTS labels_custom_update_final ON whatsapp_labels_custom;
DROP POLICY IF EXISTS labels_custom_delete_final ON whatsapp_labels_custom;

-- PASO 3: Crear políticas NUEVAS (con nombres únicos)
CREATE POLICY wlc_select_v3 ON whatsapp_labels_custom
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY wlc_insert_v3 ON whatsapp_labels_custom
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY wlc_update_v3 ON whatsapp_labels_custom
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY wlc_delete_v3 ON whatsapp_labels_custom
  FOR DELETE USING (auth.uid() = user_id);

-- PASO 4: Habilitar RLS
ALTER TABLE whatsapp_labels_custom ENABLE ROW LEVEL SECURITY;

-- PASO 5: Aplicar lo mismo para whatsapp_conversation_labels
ALTER TABLE whatsapp_conversation_labels DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden ver etiquetas de prospectos" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios autenticados pueden agregar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS conversation_labels_select_policy ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS conversation_labels_insert_policy ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS conversation_labels_update_policy ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS conversation_labels_delete_policy ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS whatsapp_conversation_labels_select ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS whatsapp_conversation_labels_insert ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS whatsapp_conversation_labels_update ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS whatsapp_conversation_labels_delete ON whatsapp_conversation_labels;

CREATE POLICY wcl_select_v3 ON whatsapp_conversation_labels
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY wcl_insert_v3 ON whatsapp_conversation_labels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY wcl_update_v3 ON whatsapp_conversation_labels
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY wcl_delete_v3 ON whatsapp_conversation_labels
  FOR DELETE USING (auth.uid() IS NOT NULL);

ALTER TABLE whatsapp_conversation_labels ENABLE ROW LEVEL SECURITY;

-- PASO 6: Verificar
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('whatsapp_labels_custom', 'whatsapp_conversation_labels')
ORDER BY tablename, policyname;

