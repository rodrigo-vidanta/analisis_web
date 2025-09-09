-- Script para crear las tablas necesarias para Agent Studio
-- Ejecutar en Supabase SQL Editor

-- Tabla para almacenar tools/herramientas
CREATE TABLE IF NOT EXISTS tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'custom',
    function_schema JSONB NOT NULL,
    server_url VARCHAR(500),
    is_async BOOLEAN DEFAULT false,
    is_reusable BOOLEAN DEFAULT true,
    messages JSONB DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    UNIQUE(name, created_by)
);

-- Tabla para almacenar plantillas de agentes
CREATE TABLE IF NOT EXISTS agent_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'custom',
    keywords TEXT[] DEFAULT '{}',
    use_cases TEXT[] DEFAULT '{}',
    is_squad BOOLEAN DEFAULT false,
    squad_config JSONB,
    single_agent_config JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    vapi_config JSONB
);

-- Tabla de relación many-to-many entre agent_templates y tools
CREATE TABLE IF NOT EXISTS agent_template_tools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_template_id UUID REFERENCES agent_templates(id) ON DELETE CASCADE,
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_template_id, tool_id)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_tools_created_by ON tools(created_by);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
CREATE INDEX IF NOT EXISTS idx_tools_is_reusable ON tools(is_reusable);

CREATE INDEX IF NOT EXISTS idx_agent_templates_created_by ON agent_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_agent_templates_category ON agent_templates(category);
CREATE INDEX IF NOT EXISTS idx_agent_templates_is_active ON agent_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_templates_is_squad ON agent_templates(is_squad);

CREATE INDEX IF NOT EXISTS idx_agent_template_tools_template ON agent_template_tools(agent_template_id);
CREATE INDEX IF NOT EXISTS idx_agent_template_tools_tool ON agent_template_tools(tool_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_templates_updated_at 
    BEFORE UPDATE ON agent_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Función para incrementar usage_count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE agent_templates 
    SET usage_count = usage_count + 1 
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) Policies
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_template_tools ENABLE ROW LEVEL SECURITY;

-- Políticas para tools
CREATE POLICY "Users can view all reusable tools" ON tools
    FOR SELECT USING (is_reusable = true OR auth.uid() = created_by);

CREATE POLICY "Users can create their own tools" ON tools
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own tools" ON tools
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own tools" ON tools
    FOR DELETE USING (auth.uid() = created_by);

-- Políticas para agent_templates
CREATE POLICY "Users can view all active templates" ON agent_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create their own templates" ON agent_templates
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates" ON agent_templates
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates" ON agent_templates
    FOR DELETE USING (auth.uid() = created_by);

-- Políticas para agent_template_tools
CREATE POLICY "Users can view template tools" ON agent_template_tools
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agent_templates 
            WHERE id = agent_template_id AND is_active = true
        )
    );

CREATE POLICY "Users can manage template tools for their templates" ON agent_template_tools
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM agent_templates 
            WHERE id = agent_template_id AND created_by = auth.uid()
        )
    );

-- Comentarios para documentación
COMMENT ON TABLE tools IS 'Almacena herramientas/funciones reutilizables para agentes';
COMMENT ON TABLE agent_templates IS 'Almacena plantillas de agentes individuales y squads';
COMMENT ON TABLE agent_template_tools IS 'Relación many-to-many entre plantillas y tools';

COMMENT ON COLUMN tools.function_schema IS 'Schema JSON de la función según especificación OpenAI';
COMMENT ON COLUMN tools.is_reusable IS 'Si la tool puede ser usada por otros usuarios';
COMMENT ON COLUMN agent_templates.is_squad IS 'True si es un squad, false si es agente individual';
COMMENT ON COLUMN agent_templates.squad_config IS 'Configuración del squad con miembros y roles';
COMMENT ON COLUMN agent_templates.single_agent_config IS 'Configuración del agente individual';
COMMENT ON COLUMN agent_templates.vapi_config IS 'Configuración VAPI original importada';

-- Insertar algunos datos de ejemplo (opcional)
-- INSERT INTO tools (name, description, category, function_schema, server_url, is_reusable, created_by)
-- VALUES 
-- ('example_tool', 'Tool de ejemplo', 'example', '{"name": "example_tool", "description": "Tool de ejemplo", "parameters": {"type": "object", "properties": {}}}', 'https://example.com/webhook', true, (SELECT id FROM auth.users LIMIT 1))
-- ON CONFLICT (name, created_by) DO NOTHING;
