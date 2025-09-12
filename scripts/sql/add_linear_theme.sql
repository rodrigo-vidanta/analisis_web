-- ============================================
-- AGREGAR TEMA LINEAR INSPIRADO EN LINEAR.APP
-- ============================================

-- Insertar el nuevo tema Linear en la tabla app_themes
INSERT INTO app_themes (
  theme_name,
  display_name,
  description,
  color_palette,
  is_active,
  created_at
) VALUES (
  'linear_theme',
  'Linear Design',
  'Diseño elegante y minimalista inspirado en Linear.app con colores sutiles y animaciones fluidas',
  '{
    "primary": "rgb(99, 102, 241)",
    "primary_dark": "rgb(79, 70, 229)", 
    "secondary": "rgb(129, 140, 248)",
    "accent": "rgb(156, 163, 175)",
    "surface": "rgb(248, 250, 252)",
    "surface_dark": "rgb(15, 23, 42)",
    "border": "rgb(226, 232, 240)",
    "border_dark": "rgb(51, 65, 85)",
    "text": "rgb(15, 23, 42)",
    "text_dark": "rgb(248, 250, 252)",
    "text_muted": "rgb(100, 116, 139)",
    "text_muted_dark": "rgb(148, 163, 184)",
    "gradient": "linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(129, 140, 248) 100%)",
    "shadow_soft": "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)",
    "shadow_elevated": "0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)",
    "blur_backdrop": "blur(12px)"
  }'::jsonb,
  false,
  NOW()
) ON CONFLICT (theme_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  color_palette = EXCLUDED.color_palette;

-- Verificar que se creó el tema
SELECT theme_name, display_name, description, is_active 
FROM app_themes 
ORDER BY created_at DESC;

SELECT 'Tema Linear agregado exitosamente' AS resultado;
