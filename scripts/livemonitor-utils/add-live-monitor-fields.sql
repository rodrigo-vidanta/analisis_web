-- ============================================
-- AGREGAR CAMPOS PARA LIVE MONITOR A TABLA PROSPECTOS
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- AGREGAR CAMPOS PARA SISTEMA DE TRANSFERENCIA
ALTER TABLE prospectos 
ADD COLUMN IF NOT EXISTS status_transferencia VARCHAR(20) DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS agente_asignado VARCHAR(100),
ADD COLUMN IF NOT EXISTS fecha_transferencia TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checkpoint_transferencia VARCHAR(50),
ADD COLUMN IF NOT EXISTS temperatura_prospecto VARCHAR(20) DEFAULT 'tibio';

-- AGREGAR CAMPOS PARA FEEDBACK DE AGENTE HUMANO
ALTER TABLE prospectos
ADD COLUMN IF NOT EXISTS feedback_agente TEXT,
ADD COLUMN IF NOT EXISTS resultado_transferencia VARCHAR(30),
ADD COLUMN IF NOT EXISTS comentarios_ia TEXT,
ADD COLUMN IF NOT EXISTS duracion_llamada_ia INTEGER,
ADD COLUMN IF NOT EXISTS prioridad_seguimiento VARCHAR(20) DEFAULT 'media';

-- AGREGAR CAMPOS ADICIONALES DE CONTROL
ALTER TABLE prospectos
ADD COLUMN IF NOT EXISTS fecha_feedback TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS agente_feedback_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS llamada_activa BOOLEAN DEFAULT FALSE;

-- CREAR TABLA PARA COLA DE AGENTES
CREATE TABLE IF NOT EXISTS agent_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name VARCHAR(100) NOT NULL,
  agent_email VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  total_calls_handled INTEGER DEFAULT 0,
  last_call_time TIMESTAMP WITH TIME ZONE,
  current_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INSERTAR AGENTES DEMO
INSERT INTO agent_queue (agent_name, agent_email, total_calls_handled) VALUES
('Carlos Mendoza', 'carlos.mendoza@grupovidanta.com', 15),
('Ana Gutiérrez', 'ana.gutierrez@grupovidanta.com', 12),
('Roberto Silva', 'roberto.silva@grupovidanta.com', 18),
('María López', 'maria.lopez@grupovidanta.com', 9),
('Diego Ramírez', 'diego.ramirez@grupovidanta.com', 21)
ON CONFLICT (agent_email) DO NOTHING;

-- VERIFICAR ESTRUCTURA ACTUALIZADA
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'prospectos' 
AND column_name LIKE '%transferencia%' 
OR column_name LIKE '%agente%'
OR column_name LIKE '%feedback%'
OR column_name LIKE '%temperatura%'
ORDER BY column_name;

-- VERIFICAR AGENTES INSERTADOS
SELECT * FROM agent_queue ORDER BY agent_name;
