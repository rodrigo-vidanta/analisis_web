-- ===============================================
-- SQL CORREGIDO PARA SUPABASE SYSTEM_UI
-- ===============================================

-- Crear tabla aws_diagram_configs
CREATE TABLE IF NOT EXISTS public.aws_diagram_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    diagram_name VARCHAR(255) NOT NULL DEFAULT 'Mi Diagrama AWS',
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
    settings JSONB DEFAULT '{"showGrid": true, "showMinimap": true, "showControls": true, "snapToGrid": false, "gridSize": 20, "theme": "light"}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_aws_diagram_configs_user_id ON public.aws_diagram_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_aws_diagram_configs_is_default ON public.aws_diagram_configs(is_default);

-- Habilitar Row Level Security
ALTER TABLE public.aws_diagram_configs ENABLE ROW LEVEL SECURITY;

-- Eliminar política si existe y crear nueva (método compatible)
DROP POLICY IF EXISTS "Users can manage own diagrams" ON public.aws_diagram_configs;

-- Crear política para gestionar diagramas propios
CREATE POLICY "Users can manage own diagrams" 
ON public.aws_diagram_configs FOR ALL 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION public.update_aws_diagram_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar timestamp automáticamente
DROP TRIGGER IF EXISTS update_aws_diagram_updated_at ON public.aws_diagram_configs;
CREATE TRIGGER update_aws_diagram_updated_at
    BEFORE UPDATE ON public.aws_diagram_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_aws_diagram_updated_at();

-- Insertar configuración por defecto
INSERT INTO public.aws_diagram_configs (
    user_id,
    diagram_name,
    nodes,
    edges,
    is_default
) VALUES (
    NULL,
    'Flujo Vidanta AI - Default',
    '[]'::jsonb,
    '[]'::jsonb,
    true
);

-- Comentarios para documentación
COMMENT ON TABLE public.aws_diagram_configs IS 'Configuraciones de diagramas AWS guardadas por usuario';
COMMENT ON COLUMN public.aws_diagram_configs.nodes IS 'Nodos del diagrama con posiciones y propiedades';
COMMENT ON COLUMN public.aws_diagram_configs.edges IS 'Conexiones del diagrama con estilos';
COMMENT ON COLUMN public.aws_diagram_configs.viewport IS 'Posición y zoom del canvas';
COMMENT ON COLUMN public.aws_diagram_configs.settings IS 'Configuraciones del editor';

-- ===============================================
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard
-- 2. Proyecto: system_ui  
-- 3. SQL Editor → New Query
-- 4. Copia y pega este código
-- 5. Ejecuta (Run)
-- 6. Verifica en Database → Tables
-- ===============================================
