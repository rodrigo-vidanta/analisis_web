-- ============================================
-- DIAGNÓSTICO: ¿Por qué Rosario no aparece?
-- ============================================

-- 1. Verificar que el prospecto existe
SELECT 
  'PROSPECTO EXISTE' as check_type,
  id, 
  nombre_completo, 
  nombre_whatsapp,
  whatsapp,
  email
FROM prospectos 
WHERE id = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';

-- 2. Contar mensajes de este prospecto
SELECT 
  'MENSAJES WHATSAPP' as check_type,
  COUNT(*) as total_mensajes
FROM mensajes_whatsapp 
WHERE prospecto_id = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';

-- 3. Ver si hay conversación
SELECT 
  'CONVERSACION WHATSAPP' as check_type,
  id,
  prospecto_id,
  created_at,
  last_message_at
FROM conversaciones_whatsapp 
WHERE prospecto_id = 'e7b2d1a7-d92a-40aa-953e-1252c5fdeb5b';

-- 4. Buscar por nombre similar (por si el nombre está diferente)
SELECT 
  'BUSQUEDA POR NOMBRE' as check_type,
  id,
  nombre_completo,
  whatsapp
FROM prospectos
WHERE 
  LOWER(nombre_completo) LIKE '%rosario%' OR
  LOWER(nombre_whatsapp) LIKE '%rosario%';

-- 5. Ver un mensaje de ejemplo para entender la estructura
SELECT 
  'EJEMPLO MENSAJE' as check_type,
  prospecto_id,
  mensaje,
  fecha,
  sender
FROM mensajes_whatsapp
LIMIT 3;
