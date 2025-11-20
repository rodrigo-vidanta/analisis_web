-- ============================================
-- LIMPIAR DATOS DE LIVE CHAT
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Ejecutar para eliminar todas las conversaciones y mensajes
-- ============================================

-- ⚠️ ADVERTENCIA: Este script eliminará TODOS los datos de Live Chat
-- Solo ejecutar si estás seguro de querer eliminar todo

-- 1. Eliminar todos los mensajes de WhatsApp
DELETE FROM mensajes_whatsapp;

-- 2. Verificar que se eliminaron
SELECT 
    '=== MENSAJES ELIMINADOS ===' as seccion,
    COUNT(*)::text as mensajes_restantes
FROM mensajes_whatsapp;

-- 3. Nota: Los prospectos NO se eliminan porque pueden tener otros datos importantes
-- Si quieres eliminar también los prospectos, ejecuta:
-- DELETE FROM prospectos;

-- 4. Verificar prospectos restantes
SELECT 
    '=== PROSPECTOS RESTANTES ===' as seccion,
    COUNT(*)::text as total_prospectos
FROM prospectos;

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Live Chat también consulta uchat_conversations en SystemUI
-- Para eliminar esas conversaciones, ejecuta en SystemUI:
-- DELETE FROM uchat_conversations;

