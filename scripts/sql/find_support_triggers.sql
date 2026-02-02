-- Obtener triggers en support_ticket_comments
SELECT 
  tgname as trigger_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.support_ticket_comments'::regclass
  AND NOT tgisinternal;

-- Obtener definición de funciones relacionadas
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%support%'
ORDER BY p.proname;
