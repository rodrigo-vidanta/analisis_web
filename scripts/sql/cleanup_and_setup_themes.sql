-- ============================================
-- LIMPIAR Y CONFIGURAR TEMAS DE LA APLICACIÓN
-- ============================================

-- 1. Eliminar temas que no funcionan o son obsoletos
DELETE FROM app_themes 
WHERE theme_name NOT IN ('default', 'linear_theme');

-- 2. Insertar/actualizar tema por defecto (actual)
INSERT INTO app_themes (
  theme_name,
  display_name,
  description,
  theme_config,
  is_active,
  created_at
) VALUES (
  'default',
  'Diseño Corporativo',
  'Diseño actual de la aplicación con gradientes y colores corporativos',
  '{
    "primary": "rgb(59, 130, 246)",
    "secondary": "rgb(129, 140, 248)", 
    "accent": "rgb(236, 72, 153)",
    "success": "rgb(34, 197, 94)",
    "warning": "rgb(245, 158, 11)",
    "error": "rgb(239, 68, 68)",
    "background": "linear-gradient(135deg, rgb(248, 250, 252) 0%, rgb(241, 245, 249) 100%)",
    "background_dark": "linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)"
  }'::jsonb,
  true,
  NOW()
) ON CONFLICT (theme_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  theme_config = EXCLUDED.theme_config;

-- 3. Insertar/actualizar tema Linear
INSERT INTO app_themes (
  theme_name,
  display_name,
  description,
  theme_config,
  is_active,
  created_at
) VALUES (
  'linear_theme',
  'Linear Design',
  'Diseño elegante y minimalista inspirado en Linear.app con colores sutiles y animaciones fluidas',
  '{
    "primary": "rgb(99, 102, 241)",
    "secondary": "rgb(129, 140, 248)",
    "accent": "rgb(156, 163, 175)",
    "success": "rgb(34, 197, 94)",
    "warning": "rgb(245, 158, 11)",
    "error": "rgb(239, 68, 68)",
    "background": "rgb(248, 250, 252)",
    "background_dark": "rgb(15, 23, 42)",
    "surface": "rgb(255, 255, 255)",
    "surface_dark": "rgb(30, 41, 59)"
  }'::jsonb,
  false,
  NOW()
) ON CONFLICT (theme_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  theme_config = EXCLUDED.theme_config;

-- 4. Verificar temas creados
SELECT 
  theme_name,
  display_name,
  description,
  is_active,
  theme_config->>'primary' as primary_color,
  theme_config->>'background' as background_color
FROM app_themes 
ORDER BY theme_name;

SELECT 'Temas limpiados y configurados correctamente' AS resultado;
