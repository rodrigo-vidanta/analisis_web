-- ============================================
-- EJECUTAR NOTIFICACIONES MANUALES
-- ============================================
-- Script para disparar notificaciones de plantillas aprobadas hoy
-- Ejecutar en: PQNC_AI (glsmifhkoaifvaegsozd)

-- 1. Ver plantillas aprobadas hoy con sus sugerencias
SELECT 
  wt.id AS template_id,
  wt.name AS template_name,
  wt.status,
  wt.uchat_synced,
  wt.created_at,
  wts.id AS suggestion_id,
  wts.suggested_by AS user_id,
  au.full_name AS usuario,
  au.email
FROM whatsapp_templates wt
INNER JOIN whatsapp_template_suggestions wts 
  ON wts.imported_to_template_id = wt.id
LEFT JOIN auth_users au 
  ON au.id = wts.suggested_by
WHERE wt.status = 'APPROVED'
  AND wt.created_at >= CURRENT_DATE
ORDER BY wt.created_at DESC;

-- 2. Ejecutar función para crear notificaciones (hoy)
SELECT * FROM create_manual_template_notifications(CURRENT_DATE);

-- 3. Ver notificaciones creadas
SELECT 
  un.id,
  un.user_id,
  au.full_name AS usuario,
  au.email,
  un.customer_name AS plantilla,
  un.message_preview,
  un.is_read,
  un.created_at,
  un.metadata->>'template_id' AS template_id,
  un.metadata->>'suggestion_id' AS suggestion_id
FROM user_notifications un
LEFT JOIN auth_users au ON au.id = un.user_id
WHERE un.notification_type = 'template_approved'
  AND un.created_at >= CURRENT_DATE
ORDER BY un.created_at DESC;

-- 4. ALTERNATIVA: Ejecutar para un rango de fechas específico
-- SELECT * FROM create_manual_template_notifications('2026-01-28 00:00:00+00'::timestamptz);

-- 5. ALTERNATIVA: Ejecutar para todas las plantillas aprobadas (sin importar fecha)
-- SELECT * FROM create_manual_template_notifications('2000-01-01 00:00:00+00'::timestamptz);
