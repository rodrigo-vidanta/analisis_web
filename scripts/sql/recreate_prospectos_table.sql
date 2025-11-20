-- ============================================
-- RECREAR TABLA PROSPECTOS
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Ejecutar en SQL Editor de Supabase
-- 
-- ⚠️ IMPORTANTE: Si también necesitas recrear llamadas_ventas y agent_queue,
-- usa el script: recreate_all_prospectos_related_tables.sql
-- ============================================

-- Crear tabla principal de prospectos
CREATE TABLE IF NOT EXISTS prospectos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre_completo VARCHAR(255),
    nombre VARCHAR(100),
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100),
    nombre_whatsapp VARCHAR(255),
    edad INTEGER,
    cumpleanos DATE,
    estado_civil VARCHAR(50),
    nombre_conyuge VARCHAR(255),
    ciudad_residencia VARCHAR(100),
    requiere_atencion_humana BOOLEAN DEFAULT false,
    contactado_por_vendedor BOOLEAN DEFAULT false,
    etapa VARCHAR(100),
    ingresos VARCHAR(50),
    score VARCHAR(20),
    whatsapp VARCHAR(50),
    telefono_principal VARCHAR(50),
    telefono_adicional VARCHAR(50),
    email VARCHAR(255),
    observaciones TEXT,
    id_uchat VARCHAR(255),
    id_airtable VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    campana_origen VARCHAR(100),
    interes_principal VARCHAR(255),
    destino_preferencia TEXT[],
    tamano_grupo INTEGER,
    cantidad_menores INTEGER,
    viaja_con VARCHAR(100),
    asesor_asignado VARCHAR(255),
    crm_data JSONB,
    id_dynamics VARCHAR(255),
    
    -- Campos para coordinaciones y ejecutivos
    coordinacion_id UUID,
    ejecutivo_id UUID,
    
    -- Campos para Live Monitor (sistema de transferencia)
    status_transferencia VARCHAR(20) DEFAULT 'pendiente',
    agente_asignado VARCHAR(100),
    fecha_transferencia TIMESTAMP WITH TIME ZONE,
    checkpoint_transferencia VARCHAR(50),
    temperatura_prospecto VARCHAR(20) DEFAULT 'tibio',
    
    -- Campos para feedback de agente humano
    feedback_agente TEXT,
    resultado_transferencia VARCHAR(30),
    comentarios_ia TEXT,
    duracion_llamada_ia INTEGER,
    prioridad_seguimiento VARCHAR(20) DEFAULT 'media',
    
    -- Campos adicionales de control
    fecha_feedback TIMESTAMP WITH TIME ZONE,
    agente_feedback_id VARCHAR(100),
    llamada_activa BOOLEAN DEFAULT FALSE
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_prospectos_whatsapp ON prospectos(whatsapp);
CREATE INDEX IF NOT EXISTS idx_prospectos_email ON prospectos(email);
CREATE INDEX IF NOT EXISTS idx_prospectos_etapa ON prospectos(etapa);
CREATE INDEX IF NOT EXISTS idx_prospectos_ciudad ON prospectos(ciudad_residencia);
CREATE INDEX IF NOT EXISTS idx_prospectos_coordinacion ON prospectos(coordinacion_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_ejecutivo ON prospectos(ejecutivo_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_id_dynamics ON prospectos(id_dynamics);
CREATE INDEX IF NOT EXISTS idx_prospectos_status_transferencia ON prospectos(status_transferencia);
CREATE INDEX IF NOT EXISTS idx_prospectos_updated_at ON prospectos(updated_at);
CREATE INDEX IF NOT EXISTS idx_prospectos_created_at ON prospectos(created_at);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_prospectos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_prospectos_updated_at ON prospectos;
CREATE TRIGGER trigger_update_prospectos_updated_at
    BEFORE UPDATE ON prospectos
    FOR EACH ROW
    EXECUTE FUNCTION update_prospectos_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE prospectos ENABLE ROW LEVEL SECURITY;

-- Política básica: permitir lectura a usuarios autenticados
-- (Ajustar según tus necesidades de permisos)
CREATE POLICY "Users can view prospectos" ON prospectos
    FOR SELECT USING (true);

CREATE POLICY "Users can insert prospectos" ON prospectos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update prospectos" ON prospectos
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete prospectos" ON prospectos
    FOR DELETE USING (true);

-- Comentarios para documentación
COMMENT ON TABLE prospectos IS 'Tabla principal de prospectos del sistema';
COMMENT ON COLUMN prospectos.id_dynamics IS 'ID del prospecto en CRM Dynamics';
COMMENT ON COLUMN prospectos.coordinacion_id IS 'ID de la coordinación asignada';
COMMENT ON COLUMN prospectos.ejecutivo_id IS 'ID del ejecutivo asignado';
COMMENT ON COLUMN prospectos.status_transferencia IS 'Estado de transferencia para Live Monitor: pendiente, en_proceso, completada, cancelada';
COMMENT ON COLUMN prospectos.temperatura_prospecto IS 'Temperatura del prospecto: frio, tibio, caliente';

SELECT 'Tabla prospectos recreada exitosamente' AS resultado;

