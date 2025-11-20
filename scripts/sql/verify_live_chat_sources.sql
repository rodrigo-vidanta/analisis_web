-- ============================================
-- VERIFICAR FUENTES DE CONVERSACIONES EN LIVE CHAT
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- ============================================

-- 1. Verificar qué devuelve get_conversations_ordered()
SELECT 
    '=== RPC get_conversations_ordered() ===' as fuente,
    COUNT(*)::text as total_conversaciones
FROM get_conversations_ordered();

-- 2. Ver las conversaciones que devuelve
SELECT * FROM get_conversations_ordered() LIMIT 10;

-- 3. Verificar prospectos con WhatsApp pero sin mensajes
SELECT 
    '=== PROSPECTOS SIN MENSAJES ===' as tipo,
    COUNT(*)::text as total
FROM prospectos p
WHERE p.whatsapp IS NOT NULL 
AND p.whatsapp != ''
AND NOT EXISTS (
    SELECT 1 FROM mensajes_whatsapp m 
    WHERE m.prospecto_id = p.id
);

-- 4. Verificar prospectos con mensajes
SELECT 
    '=== PROSPECTOS CON MENSAJES ===' as tipo,
    COUNT(DISTINCT p.id)::text as total
FROM prospectos p
INNER JOIN mensajes_whatsapp m ON m.prospecto_id = p.id
WHERE p.whatsapp IS NOT NULL;

-- 5. Resumen completo
SELECT 
    'RESUMEN' as seccion,
    'Total prospectos con WhatsApp' as categoria,
    COUNT(*)::text as valor
FROM prospectos
WHERE whatsapp IS NOT NULL AND whatsapp != ''
UNION ALL
SELECT 
    'RESUMEN' as seccion,
    'Prospectos con mensajes' as categoria,
    COUNT(DISTINCT prospecto_id)::text as valor
FROM mensajes_whatsapp
UNION ALL
SELECT 
    'RESUMEN' as seccion,
    'Conversaciones en RPC' as categoria,
    COUNT(*)::text as valor
FROM get_conversations_ordered();

