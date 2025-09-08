-- Script para agregar lógica de pertenencia de usuarios
-- Base de datos: rnhejbuubpbnojalljso.supabase.co (Base Principal)

-- Agregar campo created_by a agent_templates si no existe
ALTER TABLE agent_templates 
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'imported';

-- Crear índice para mejor rendimiento en consultas por usuario
CREATE INDEX IF NOT EXISTS idx_agent_templates_created_by ON agent_templates(created_by);

-- Actualizar agentes existentes que no tienen created_by
UPDATE agent_templates 
SET created_by = 'imported' 
WHERE created_by IS NULL OR created_by = '';

-- Agregar campo created_by a tools_catalog si no existe
ALTER TABLE tools_catalog 
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'imported';

-- Crear índice para mejor rendimiento en consultas por usuario
CREATE INDEX IF NOT EXISTS idx_tools_catalog_created_by ON tools_catalog(created_by);

-- Actualizar herramientas existentes que no tienen created_by
UPDATE tools_catalog 
SET created_by = 'imported' 
WHERE created_by IS NULL OR created_by = '';

-- Agregar campo created_by a system_prompts si no existe
ALTER TABLE system_prompts 
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'imported';

-- Crear índice para mejor rendimiento en consultas por usuario
CREATE INDEX IF NOT EXISTS idx_system_prompts_created_by ON system_prompts(created_by);

-- Actualizar prompts existentes que no tienen created_by
UPDATE system_prompts 
SET created_by = 'imported' 
WHERE created_by IS NULL OR created_by = '';
