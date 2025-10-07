-- Tabla para guardar configuraciones del diagrama AWS
-- Base de datos: system_ui

CREATE TABLE IF NOT EXISTS aws_diagram_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    diagram_name VARCHAR(255) NOT NULL DEFAULT 'Mi Diagrama AWS',
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
    settings JSONB DEFAULT '{
        "showGrid": true,
        "showMinimap": true,
        "showControls": true,
        "snapToGrid": false,
        "gridSize": 20,
        "theme": "light"
    }'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_aws_diagram_configs_user_id ON aws_diagram_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_aws_diagram_configs_is_default ON aws_diagram_configs(is_default);
CREATE INDEX IF NOT EXISTS idx_aws_diagram_configs_created_at ON aws_diagram_configs(created_at);

-- RLS (Row Level Security)
ALTER TABLE aws_diagram_configs ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios solo vean sus propios diagramas
CREATE POLICY IF NOT EXISTS "Users can view own diagram configs" 
ON aws_diagram_configs FOR SELECT 
USING (auth.uid() = user_id);

-- Política para insertar
CREATE POLICY IF NOT EXISTS "Users can insert own diagram configs" 
ON aws_diagram_configs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política para actualizar
CREATE POLICY IF NOT EXISTS "Users can update own diagram configs" 
ON aws_diagram_configs FOR UPDATE 
USING (auth.uid() = user_id);

-- Política para eliminar
CREATE POLICY IF NOT EXISTS "Users can delete own diagram configs" 
ON aws_diagram_configs FOR DELETE 
USING (auth.uid() = user_id);

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_aws_diagram_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar timestamp
DROP TRIGGER IF EXISTS update_aws_diagram_configs_updated_at ON aws_diagram_configs;
CREATE TRIGGER update_aws_diagram_configs_updated_at
    BEFORE UPDATE ON aws_diagram_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_aws_diagram_configs_updated_at();

-- Insertar configuración por defecto para el flujo Vidanta AI
INSERT INTO aws_diagram_configs (
    user_id,
    diagram_name,
    nodes,
    edges,
    is_default
) VALUES (
    '00000000-0000-0000-0000-000000000000', -- UUID placeholder para admin
    'Flujo Vidanta AI - Default',
    '[
        {
            "id": "social-media",
            "type": "editable",
            "position": {"x": 100, "y": 50},
            "data": {
                "label": "Redes Sociales",
                "subtitle": "Facebook, Instagram, Google Ads",
                "category": "social-blue",
                "iconName": "Users",
                "showMetrics": false,
                "status": "healthy"
            }
        },
        {
            "id": "whatsapp",
            "type": "editable", 
            "position": {"x": 400, "y": 50},
            "data": {
                "label": "WhatsApp Business",
                "subtitle": "Primer Contacto",
                "category": "whatsapp-green",
                "iconName": "MessageCircle",
                "showMetrics": false,
                "status": "healthy"
            }
        }
    ]',
    '[
        {
            "id": "social-whatsapp",
            "source": "social-media",
            "target": "whatsapp",
            "type": "smoothstep",
            "animated": true,
            "style": {"stroke": "#3b82f6", "strokeWidth": 2},
            "markerEnd": {"type": "arrowclosed", "color": "#3b82f6"},
            "label": "Leads"
        }
    ]',
    true
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE aws_diagram_configs IS 'Configuraciones guardadas de diagramas AWS para cada usuario';
COMMENT ON COLUMN aws_diagram_configs.nodes IS 'Nodos del diagrama en formato JSON con posiciones y propiedades';
COMMENT ON COLUMN aws_diagram_configs.edges IS 'Conexiones del diagrama con estilos y animaciones';
COMMENT ON COLUMN aws_diagram_configs.viewport IS 'Posición y zoom del viewport del diagrama';
COMMENT ON COLUMN aws_diagram_configs.settings IS 'Configuraciones del editor (grid, minimap, etc.)';
COMMENT ON COLUMN aws_diagram_configs.is_default IS 'Indica si es la configuración por defecto del sistema';
