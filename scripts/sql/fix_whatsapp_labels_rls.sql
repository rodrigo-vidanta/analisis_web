-- ============================================
-- FIX: Políticas RLS para Etiquetas WhatsApp
-- ============================================
-- Base: SYSTEM_UI (zbylezfyagwrxoecioup)
-- Problema: auth.role() no funciona, debe ser auth.uid()
-- ============================================

-- Eliminar políticas incorrectas
DROP POLICY IF EXISTS "Usuarios pueden ver etiquetas preset" ON whatsapp_labels_preset;
DROP POLICY IF EXISTS "Usuarios pueden ver sus etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden crear etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden actualizar sus etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus etiquetas custom" ON whatsapp_labels_custom;
DROP POLICY IF EXISTS "Usuarios pueden ver etiquetas de prospectos" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios pueden agregar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios pueden actualizar etiquetas" ON whatsapp_conversation_labels;
DROP POLICY IF EXISTS "Usuarios pueden eliminar etiquetas" ON whatsapp_conversation_labels;

-- Políticas CORRECTAS para etiquetas preset (todos pueden ver)
CREATE POLICY "Usuarios autenticados pueden ver etiquetas preset" 
  ON whatsapp_labels_preset FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admins pueden modificar etiquetas preset" 
  ON whatsapp_labels_preset FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'administrador_operativo')
    )
  );

-- Políticas CORRECTAS para etiquetas custom (solo el dueño)
CREATE POLICY "Usuarios pueden ver sus etiquetas custom" 
  ON whatsapp_labels_custom FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear etiquetas custom" 
  ON whatsapp_labels_custom FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL); -- Permisivo porque el trigger valida el límite

CREATE POLICY "Usuarios pueden actualizar sus etiquetas custom" 
  ON whatsapp_labels_custom FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus etiquetas custom" 
  ON whatsapp_labels_custom FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas CORRECTAS para relación prospecto-etiquetas
-- IMPORTANTE: Las funciones RPC tienen SECURITY DEFINER, así que necesitan políticas permisivas

CREATE POLICY "Usuarios autenticados pueden ver etiquetas de prospectos" 
  ON whatsapp_conversation_labels FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden agregar etiquetas" 
  ON whatsapp_conversation_labels FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar etiquetas" 
  ON whatsapp_conversation_labels FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden eliminar etiquetas" 
  ON whatsapp_conversation_labels FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

