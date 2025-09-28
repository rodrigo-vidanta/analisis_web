-- ============================================
-- LIMPIAR TRIGGERS DUPLICADOS SOLAMENTE
-- Base de datos: hmmfuhqgvsehkizlfzga.supabase.co (PQNC)
-- ============================================

-- Eliminar triggers duplicados que están causando errores
DROP TRIGGER IF EXISTS trigger_cleanup_audio_history ON ai_audio_generations;
DROP TRIGGER IF EXISTS trigger_ai_token_usage_update ON ai_token_usage;

-- Verificar que las tablas existen
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_audio_generations' AND table_schema = 'public')
    THEN '✅ ai_audio_generations existe'
    ELSE '❌ ai_audio_generations NO existe'
  END as tabla_audio_generations;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_token_usage' AND table_schema = 'public')
    THEN '✅ ai_token_usage existe'
    ELSE '❌ ai_token_usage NO existe'
  END as tabla_token_usage;

-- Verificar que el rol productor existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth_roles WHERE name = 'productor')
    THEN '✅ Rol productor existe'
    ELSE '❌ Rol productor NO existe'
  END as rol_productor;

-- Verificar permisos de AI Models
SELECT COUNT(*) as permisos_ai_models
FROM auth_permissions 
WHERE module = 'ai_models';
