-- ===============================================
-- EJECUTA ESTE SQL EN TU CONSOLA DE SUPABASE
-- Base de datos: system_ui
-- ===============================================

-- Crear tabla aws_diagram_configs
CREATE TABLE IF NOT EXISTS public.aws_diagram_configs (
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

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_aws_diagram_configs_user_id ON public.aws_diagram_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_aws_diagram_configs_is_default ON public.aws_diagram_configs(is_default);
CREATE INDEX IF NOT EXISTS idx_aws_diagram_configs_created_at ON public.aws_diagram_configs(created_at);

-- Habilitar Row Level Security
ALTER TABLE public.aws_diagram_configs ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
DROP POLICY IF EXISTS "Users can view own diagram configs" ON public.aws_diagram_configs;
CREATE POLICY "Users can view own diagram configs" 
ON public.aws_diagram_configs FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert own diagram configs" ON public.aws_diagram_configs;
CREATE POLICY "Users can insert own diagram configs" 
ON public.aws_diagram_configs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own diagram configs" ON public.aws_diagram_configs;
CREATE POLICY "Users can update own diagram configs" 
ON public.aws_diagram_configs FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own diagram configs" ON public.aws_diagram_configs;
CREATE POLICY "Users can delete own diagram configs" 
ON public.aws_diagram_configs FOR DELETE 
USING (auth.uid() = user_id);

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION public.update_aws_diagram_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar timestamp
DROP TRIGGER IF EXISTS update_aws_diagram_configs_updated_at ON public.aws_diagram_configs;
CREATE TRIGGER update_aws_diagram_configs_updated_at
    BEFORE UPDATE ON public.aws_diagram_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_aws_diagram_configs_updated_at();

-- Insertar configuración por defecto
INSERT INTO public.aws_diagram_configs (
    user_id,
    diagram_name,
    nodes,
    edges,
    is_default
) VALUES (
    NULL, -- Sin usuario específico para que sea accesible a todos
    'Flujo Vidanta AI - Default',
    '[]'::jsonb,
    '[]'::jsonb,
    true
) ON CONFLICT DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE public.aws_diagram_configs IS 'Configuraciones guardadas de diagramas AWS para cada usuario';
COMMENT ON COLUMN public.aws_diagram_configs.nodes IS 'Nodos del diagrama en formato JSON con posiciones y propiedades';
COMMENT ON COLUMN public.aws_diagram_configs.edges IS 'Conexiones del diagrama con estilos y animaciones';
COMMENT ON COLUMN public.aws_diagram_configs.viewport IS 'Posición y zoom del viewport del diagrama';
COMMENT ON COLUMN public.aws_diagram_configs.settings IS 'Configuraciones del editor (grid, minimap, etc.)';
COMMENT ON COLUMN public.aws_diagram_configs.is_default IS 'Indica si es la configuración por defecto del sistema';

-- ===============================================
-- INSTRUCCIONES:
-- 1. Copia todo este SQL
-- 2. Ve a tu dashboard de Supabase
-- 3. Proyecto: system_ui
-- 4. SQL Editor → New Query
-- 5. Pega este código y ejecuta
-- 6. Verifica que la tabla aparezca en Database
-- ===============================================
