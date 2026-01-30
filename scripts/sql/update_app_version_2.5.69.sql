-- ======================================
-- ACTUALIZAR VERSIÓN DE APP EN BD
-- ======================================
-- Fecha: 2026-01-29
-- Versión: v2.5.69
-- Build: B10.1.44N2.5.69
-- Tipo: HOTFIX
-- Estado: ✅ EJECUTADO (2026-01-29 19:49 UTC)
-- ======================================

-- Actualizar la versión en system_config
UPDATE system_config
SET 
  config_value = '{"version": "B10.1.44N2.5.69", "force_update": true}'::jsonb,
  description = 'Versión actual de la aplicación - v2.5.69: HOTFIX Restricciones UI "Importado Manual"'
WHERE config_key = 'app_version';

-- Verificar el cambio
SELECT 
  config_key,
  config_value->>'version' as version,
  (config_value->>'force_update')::boolean as force_update,
  description,
  updated_at
FROM system_config
WHERE config_key = 'app_version';

-- ======================================
-- RESULTADO ESPERADO:
-- ======================================
-- config_key: app_version
-- version: B10.1.44N2.5.69
-- force_update: true
-- description: Versión actual de la aplicación - v2.5.69: HOTFIX Restricciones UI "Importado Manual"
-- updated_at: [timestamp actual]
-- ======================================
