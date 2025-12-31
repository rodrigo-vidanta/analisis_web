-- ============================================
-- RESET COMPLETO DE POLÍTICAS RLS - WhatsApp Labels
-- Base: SYSTEM_UI (zbylezfyagwrxoecioup)
-- ============================================
-- Este script FUERZA la eliminación y recreación
-- ============================================

-- ============================================
-- 1. DESHABILITAR RLS TEMPORALMENTE
-- ============================================

ALTER TABLE whatsapp_labels_preset DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_labels_custom DISABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_labels DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. ELIMINAR TODAS LAS POLÍTICAS (FORCE)
-- ============================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de whatsapp_labels_preset
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'whatsapp_labels_preset') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON whatsapp_labels_preset';
    END LOOP;
    
    -- Eliminar todas las políticas de whatsapp_labels_custom
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'whatsapp_labels_custom') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON whatsapp_labels_custom';
    END LOOP;
    
    -- Eliminar todas las políticas de whatsapp_conversation_labels
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'whatsapp_conversation_labels') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON whatsapp_conversation_labels';
    END LOOP;
END $$;

-- ============================================
-- 3. CREAR POLÍTICAS NUEVAS
-- ============================================

-- whatsapp_labels_preset
CREATE POLICY whatsapp_labels_preset_select ON whatsapp_labels_preset
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY whatsapp_labels_preset_all ON whatsapp_labels_preset
  FOR ALL USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM auth_users u 
      JOIN auth_roles r ON u.role_id = r.id 
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'administrador_operativo')
    )
  );

-- whatsapp_labels_custom
CREATE POLICY whatsapp_labels_custom_select ON whatsapp_labels_custom
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY whatsapp_labels_custom_insert ON whatsapp_labels_custom
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY whatsapp_labels_custom_update ON whatsapp_labels_custom
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY whatsapp_labels_custom_delete ON whatsapp_labels_custom
  FOR DELETE USING (auth.uid() = user_id);

-- whatsapp_conversation_labels
CREATE POLICY whatsapp_conversation_labels_select ON whatsapp_conversation_labels
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY whatsapp_conversation_labels_insert ON whatsapp_conversation_labels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY whatsapp_conversation_labels_update ON whatsapp_conversation_labels
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY whatsapp_conversation_labels_delete ON whatsapp_conversation_labels
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- 4. HABILITAR RLS NUEVAMENTE
-- ============================================

ALTER TABLE whatsapp_labels_preset ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_labels_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_labels ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. VERIFICACIÓN
-- ============================================

SELECT 
  tablename, 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename LIKE 'whatsapp_labels%'
ORDER BY tablename, policyname;

