-- ============================================
-- RECREAR Políticas RLS para Etiquetas WhatsApp
-- Base: SYSTEM_UI (zbylezfyagwrxoecioup)
-- ============================================
-- Este script ELIMINA y RECREA todas las políticas
-- ============================================

-- ============================================
-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================

-- Políticas de whatsapp_labels_preset
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver etiquetas preset" ON whatsapp_labels_preset;
DROP POLICY IF EXISTS "Usuarios pueden ver etiquetas preset" ON whatsapp_labels_preset;
DROP POLICY IF EXISTS "Solo admins pueden modificar etiquetas preset" ON whatsapp_labels_preset;

-- Políticas de whatsapp_labels_custom
DROP POLICY IF EXISTS "Usuarios pueden ver sus etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden crear etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus etiquetas custom" ON whatsapp_labels_custom;

-- Políticas de whatsapp_conversation_labels
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver etiquetas de prospectos" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios pueden ver etiquetas de prospectos" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios autenticados pueden agregar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios pueden agregar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios pueden actualizar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios pueden eliminar etiquetas" ON whatsapp_conversation_labels;

-- ============================================
-- 2. CREAR POLÍTICAS CORRECTAS
-- ============================================

-- Políticas para etiquetas preset (todos pueden ver, solo admins modificar)
CREATE POLICY "preset_select_policy" 
  ON whatsapp_labels_preset FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "preset_modify_policy" 
  ON whatsapp_labels_preset FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'administrador_operativo')
    )
  );

-- Políticas para etiquetas custom (solo el dueño)
CREATE POLICY "custom_select_policy" 
  ON whatsapp_labels_custom FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "custom_insert_policy" 
  ON whatsapp_labels_custom FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "custom_update_policy" 
  ON whatsapp_labels_custom FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "custom_delete_policy" 
  ON whatsapp_labels_custom FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para relación prospecto-etiquetas (todos autenticados)
CREATE POLICY "conversation_labels_select_policy" 
  ON whatsapp_conversation_labels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "conversation_labels_insert_policy" 
  ON whatsapp_conversation_labels FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conversation_labels_update_policy" 
  ON whatsapp_conversation_labels FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conversation_labels_delete_policy" 
  ON whatsapp_conversation_labels FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Verificar políticas creadas
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'whatsapp_labels%'
ORDER BY tablename, policyname;

