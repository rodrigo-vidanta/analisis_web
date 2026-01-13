-- ============================================
-- CREAR TABLAS DE CONFIGURACIÓN DEL SISTEMA
-- PQNC_AI
-- Fecha: 2025-01-13
-- ============================================
-- 
-- Estas tablas no existían en system_ui, pero son necesarias
-- para el funcionamiento del frontend (useSystemConfig, SystemPreferences)
-- 
-- ⚠️ IMPORTANTE: Ejecutar en PQNC_AI
-- ============================================

-- ============================================
-- 1. TABLA: system_config
-- ============================================
-- Almacena configuración del sistema (branding, tema, etc.)

CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_active ON system_config(is_active);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_config_updated_at ON system_config;
CREATE TRIGGER trigger_update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW
    EXECUTE FUNCTION update_system_config_updated_at();

-- ============================================
-- 2. TABLA: app_themes
-- ============================================
-- Almacena temas visuales disponibles para la aplicación

CREATE TABLE IF NOT EXISTS app_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    theme_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_app_themes_name ON app_themes(theme_name);
CREATE INDEX IF NOT EXISTS idx_app_themes_active ON app_themes(is_active);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_app_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_themes_updated_at ON app_themes;
CREATE TRIGGER trigger_update_app_themes_updated_at
    BEFORE UPDATE ON app_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_app_themes_updated_at();

-- ============================================
-- 3. DATOS INICIALES: system_config
-- ============================================

-- Configuración de branding por defecto
INSERT INTO system_config (config_key, config_value, description)
VALUES (
    'app_branding',
    '{
        "app_name": "PQNC QA AI Platform",
        "company_name": "Vidanta",
        "logo_url": "",
        "favicon_url": "/favicon.ico",
        "login_description": "Plataforma de Análisis y Gestión de Calidad",
        "header_description": "Sistema Inteligente de Monitoreo"
    }'::jsonb,
    'Configuración de branding de la aplicación'
)
ON CONFLICT (config_key) DO NOTHING;

-- Configuración de tema por defecto
INSERT INTO system_config (config_key, config_value, description)
VALUES (
    'app_theme',
    '{
        "active_theme": "default",
        "allow_user_theme_selection": false,
        "custom_css": ""
    }'::jsonb,
    'Configuración de tema activo de la aplicación'
)
ON CONFLICT (config_key) DO NOTHING;

-- Configuración de logo seleccionado
INSERT INTO system_config (config_key, config_value, description)
VALUES (
    'selected_logo',
    '{
        "logo_type": "default"
    }'::jsonb,
    'Logo seleccionado actualmente'
)
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- 4. DATOS INICIALES: app_themes
-- ============================================

-- Tema Corporativo
INSERT INTO app_themes (theme_name, display_name, description, theme_config, is_active)
VALUES (
    'corporativo',
    'Corporativo',
    'Tema corporativo con colores de marca',
    '{
        "primary": "#1e40af",
        "secondary": "#7c3aed",
        "accent": "#2563eb",
        "background": "#ffffff",
        "surface": "#f9fafb"
    }'::jsonb,
    true
)
ON CONFLICT (theme_name) DO NOTHING;

-- Tema Linear (minimalista)
INSERT INTO app_themes (theme_name, display_name, description, theme_config, is_active)
VALUES (
    'linear',
    'Linear',
    'Tema minimalista inspirado en Linear',
    '{
        "primary": "#5E6AD2",
        "secondary": "#26B5CE",
        "accent": "#3D63DD",
        "background": "#ffffff",
        "surface": "#fafafa"
    }'::jsonb,
    true
)
ON CONFLICT (theme_name) DO NOTHING;

-- ============================================
-- 5. FUNCIONES RPC PARA ACTUALIZAR CONFIGURACIÓN
-- ============================================

-- Función para actualizar configuración del sistema
CREATE OR REPLACE FUNCTION update_system_config(
    p_config_key VARCHAR,
    p_new_value JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Actualizar o insertar configuración
    INSERT INTO system_config (config_key, config_value)
    VALUES (p_config_key, p_new_value)
    ON CONFLICT (config_key) 
    DO UPDATE SET 
        config_value = p_new_value,
        updated_at = NOW();
    
    -- Retornar resultado
    RETURN jsonb_build_object(
        'success', true,
        'config_key', p_config_key,
        'config_value', p_new_value
    );
END;
$$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

SELECT 
    'Tablas de configuración creadas' as resultado,
    (SELECT COUNT(*) FROM system_config) as registros_system_config,
    (SELECT COUNT(*) FROM app_themes) as registros_app_themes;
