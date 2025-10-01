-- ============================================
-- SYSTEM UI DATABASE SCHEMA
-- Base de datos para administración de prompts y UI
-- ============================================

-- Tabla para versiones de prompts (específica para VAPI)
CREATE TABLE IF NOT EXISTS prompt_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id VARCHAR(255) NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  node_name VARCHAR(255) NOT NULL,
  prompt_content TEXT NOT NULL,
  prompt_type VARCHAR(100) DEFAULT 'system_message', -- system_message, user_message, assistant_message
  checkpoint_name VARCHAR(255), -- Checkpoint 1: Saludo, etc.
  message_index INTEGER, -- Índice en el array de mensajes
  parameter_key VARCHAR(500) NOT NULL, -- assistant.model.messages[0]
  seconds_from_start INTEGER DEFAULT 0,
  version_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  change_description TEXT,
  performance_score DECIMAL(5,2) DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  
  -- Índices para optimización
  CONSTRAINT unique_active_prompt UNIQUE (workflow_id, node_id, parameter_key, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Tabla para métricas de workflows
CREATE TABLE IF NOT EXISTS workflow_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id VARCHAR(255) UNIQUE NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  last_execution TIMESTAMP WITH TIME ZONE,
  avg_execution_time INTEGER DEFAULT 0, -- en milisegundos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para log de cambios
CREATE TABLE IF NOT EXISTS prompt_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('create', 'update', 'activate', 'deactivate')),
  old_content TEXT,
  new_content TEXT,
  change_description TEXT NOT NULL,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  impact_score DECIMAL(5,2) DEFAULT 0
);

-- Tabla para configuración del módulo
CREATE TABLE IF NOT EXISTS prompt_module_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key VARCHAR(255) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para prompt_versions
CREATE INDEX IF NOT EXISTS idx_prompt_versions_workflow_id ON prompt_versions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_node_id ON prompt_versions(node_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_active ON prompt_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_at ON prompt_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_performance ON prompt_versions(performance_score DESC);

-- Índices para workflow_metrics
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_success_rate ON workflow_metrics(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_last_execution ON workflow_metrics(last_execution DESC);

-- Índices para prompt_change_log
CREATE INDEX IF NOT EXISTS idx_prompt_change_log_version_id ON prompt_change_log(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_change_log_changed_at ON prompt_change_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_change_log_change_type ON prompt_change_log(change_type);

-- ============================================
-- FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para workflow_metrics
DROP TRIGGER IF EXISTS update_workflow_metrics_updated_at ON workflow_metrics;
CREATE TRIGGER update_workflow_metrics_updated_at
  BEFORE UPDATE ON workflow_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para prompt_module_config
DROP TRIGGER IF EXISTS update_prompt_module_config_updated_at ON prompt_module_config;
CREATE TRIGGER update_prompt_module_config_updated_at
  BEFORE UPDATE ON prompt_module_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Configuración inicial del módulo
INSERT INTO prompt_module_config (config_key, config_value, description) VALUES
('n8n_api_url', '"https://your-n8n-instance.com/api/v1"', 'URL base de la API de n8n'),
('auto_sync_interval', '300', 'Intervalo de sincronización automática en segundos'),
('max_versions_per_prompt', '10', 'Máximo número de versiones a mantener por prompt'),
('performance_threshold', '85.0', 'Umbral de rendimiento para prompts (%)'),
('metrics_retention_days', '90', 'Días de retención de métricas')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_module_config ENABLE ROW LEVEL SECURITY;

-- Políticas para prompt_versions
CREATE POLICY "Usuarios autenticados pueden ver prompt_versions" ON prompt_versions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar prompt_versions" ON prompt_versions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar prompt_versions" ON prompt_versions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para workflow_metrics
CREATE POLICY "Usuarios autenticados pueden ver workflow_metrics" ON workflow_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar workflow_metrics" ON workflow_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar workflow_metrics" ON workflow_metrics
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para prompt_change_log
CREATE POLICY "Usuarios autenticados pueden ver prompt_change_log" ON prompt_change_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden insertar prompt_change_log" ON prompt_change_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para prompt_module_config
CREATE POLICY "Usuarios autenticados pueden ver prompt_module_config" ON prompt_module_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Solo service_role puede modificar prompt_module_config" ON prompt_module_config
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE prompt_versions IS 'Versiones de prompts de workflows n8n con control de cambios';
COMMENT ON TABLE workflow_metrics IS 'Métricas de rendimiento de workflows';
COMMENT ON TABLE prompt_change_log IS 'Historial de cambios en prompts';
COMMENT ON TABLE prompt_module_config IS 'Configuración del módulo de prompts';

COMMENT ON COLUMN prompt_versions.performance_score IS 'Score calculado basado en métricas (0-100)';
COMMENT ON COLUMN prompt_versions.success_rate IS 'Porcentaje de ejecuciones exitosas';
COMMENT ON COLUMN workflow_metrics.avg_execution_time IS 'Tiempo promedio de ejecución en milisegundos';
COMMENT ON COLUMN prompt_change_log.impact_score IS 'Impacto del cambio en el rendimiento';
