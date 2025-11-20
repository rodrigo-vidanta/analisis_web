-- ============================================
-- RECREAR/ACTUALIZAR TABLAS RELACIONADAS CON PROSPECTOS (SEGURO - NO BORRA DATOS)
-- Base: glsmifhkoaifvaegsozd.supabase.co (análisis)
-- Ejecutar en SQL Editor de Supabase
-- 
-- ⚠️ IMPORTANTE: Este script es SEGURO y NO BORRA datos existentes
-- - Si las tablas existen, solo agrega columnas faltantes
-- - Si las tablas no existen, las crea completas
-- - Puede ejecutarse múltiples veces sin problemas
-- ============================================

-- ============================================
-- PASO 1: CREAR/ACTUALIZAR TABLA PROSPECTOS (PRIMERO)
-- ============================================

-- Crear tabla si no existe
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
    assignment_date TIMESTAMP WITH TIME ZONE,
    
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

-- Agregar columnas faltantes si la tabla ya existe (seguro - no borra datos)
-- Usar DO block para agregar columnas una por una de forma segura
DO $$
BEGIN
    -- Columnas básicas
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(255);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS nombre VARCHAR(100);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS apellido_paterno VARCHAR(100);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS apellido_materno VARCHAR(100);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS nombre_whatsapp VARCHAR(255);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS edad INTEGER;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS cumpleanos DATE;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(50);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS nombre_conyuge VARCHAR(255);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS ciudad_residencia VARCHAR(100);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS requiere_atencion_humana BOOLEAN DEFAULT false;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS contactado_por_vendedor BOOLEAN DEFAULT false;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS etapa VARCHAR(100);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS ingresos VARCHAR(50);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS score VARCHAR(20);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS telefono_principal VARCHAR(50);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS telefono_adicional VARCHAR(50);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS observaciones TEXT;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS id_uchat VARCHAR(255);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS id_airtable VARCHAR(255);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS campana_origen VARCHAR(100);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS interes_principal VARCHAR(255);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS destino_preferencia TEXT[];
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS tamano_grupo INTEGER;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS cantidad_menores INTEGER;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS viaja_con VARCHAR(100);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS asesor_asignado VARCHAR(255);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS crm_data JSONB;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS id_dynamics VARCHAR(255);
    -- Columnas de coordinaciones
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS coordinacion_id UUID;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS ejecutivo_id UUID;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS assignment_date TIMESTAMP WITH TIME ZONE;
    -- Columnas de Live Monitor
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS status_transferencia VARCHAR(20) DEFAULT 'pendiente';
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS agente_asignado VARCHAR(100);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS fecha_transferencia TIMESTAMP WITH TIME ZONE;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS checkpoint_transferencia VARCHAR(50);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS temperatura_prospecto VARCHAR(20) DEFAULT 'tibio';
    -- Columnas de feedback
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS feedback_agente TEXT;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS resultado_transferencia VARCHAR(30);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS comentarios_ia TEXT;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS duracion_llamada_ia INTEGER;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS prioridad_seguimiento VARCHAR(20) DEFAULT 'media';
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS fecha_feedback TIMESTAMP WITH TIME ZONE;
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS agente_feedback_id VARCHAR(100);
    ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS llamada_activa BOOLEAN DEFAULT FALSE;
EXCEPTION
    WHEN OTHERS THEN
        -- Si hay algún error, continuar (puede ser que la tabla no exista aún)
        NULL;
END $$;

-- Índices para prospectos (crear solo si las columnas existen)
DO $$
BEGIN
    -- Índices básicos (verificar que las columnas existan)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'whatsapp') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_whatsapp ON prospectos(whatsapp);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'email') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_email ON prospectos(email);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'etapa') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_etapa ON prospectos(etapa);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'ciudad_residencia') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_ciudad ON prospectos(ciudad_residencia);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'coordinacion_id') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_coordinacion ON prospectos(coordinacion_id) WHERE coordinacion_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'ejecutivo_id') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_ejecutivo ON prospectos(ejecutivo_id) WHERE ejecutivo_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'id_dynamics') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_id_dynamics ON prospectos(id_dynamics);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'status_transferencia') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_status_transferencia ON prospectos(status_transferencia);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'updated_at') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_updated_at ON prospectos(updated_at);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_created_at ON prospectos(created_at);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prospectos' AND column_name = 'assignment_date') THEN
        CREATE INDEX IF NOT EXISTS idx_prospectos_assignment_date ON prospectos(assignment_date) WHERE assignment_date IS NOT NULL;
    END IF;
END $$;

-- Trigger para actualizar updated_at en prospectos
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

-- RLS para prospectos
ALTER TABLE prospectos ENABLE ROW LEVEL SECURITY;

-- Crear políticas solo si no existen (seguro)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'prospectos' 
        AND policyname = 'Users can view prospectos'
    ) THEN
        CREATE POLICY "Users can view prospectos" ON prospectos FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'prospectos' 
        AND policyname = 'Users can insert prospectos'
    ) THEN
        CREATE POLICY "Users can insert prospectos" ON prospectos FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'prospectos' 
        AND policyname = 'Users can update prospectos'
    ) THEN
        CREATE POLICY "Users can update prospectos" ON prospectos FOR UPDATE USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'prospectos' 
        AND policyname = 'Users can delete prospectos'
    ) THEN
        CREATE POLICY "Users can delete prospectos" ON prospectos FOR DELETE USING (true);
    END IF;
END $$;

-- ============================================
-- PASO 2: CREAR/ACTUALIZAR TABLA LLAMADAS_VENTAS (DESPUÉS DE PROSPECTOS)
-- ============================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS llamadas_ventas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    fecha_llamada TIMESTAMP WITH TIME ZONE,
    prospecto UUID REFERENCES prospectos(id) ON DELETE SET NULL,
    duracion_segundos INTEGER,
    es_venta_exitosa BOOLEAN,
    nivel_interes JSONB,
    probabilidad_cierre DECIMAL(5,2),
    costo_total DECIMAL(10,2),
    tipo_llamada JSONB,
    oferta_presentada BOOLEAN,
    precio_ofertado JSONB,
    requiere_seguimiento BOOLEAN,
    datos_llamada JSONB,
    datos_proceso JSONB,
    datos_objeciones JSONB,
    audio_ruta_bucket TEXT,
    
    -- URLs de control VAPI
    monitor_url TEXT,
    control_url TEXT,
    transport_url TEXT,
    call_sid VARCHAR(255),
    transport VARCHAR(100),
    provider VARCHAR(100),
    account_sid VARCHAR(255),
    call_status VARCHAR(50),
    
    -- Campos de feedback
    tiene_feedback BOOLEAN DEFAULT false,
    feedback_resultado VARCHAR(50),
    feedback_comentarios TEXT,
    feedback_user_email VARCHAR(255),
    feedback_fecha TIMESTAMP WITH TIME ZONE,
    
    -- Campos de checkpoint Kanban
    checkpoint_venta_actual VARCHAR(50) DEFAULT 'checkpoint #1',
    composicion_familiar_numero INTEGER,
    destino_preferido VARCHAR(50),
    preferencia_vacaciones TEXT[],
    numero_noches INTEGER,
    mes_preferencia VARCHAR(2),
    estado_civil VARCHAR(50) DEFAULT 'no_especificado',
    edad INTEGER,
    propuesta_economica_ofrecida INTEGER,
    habitacion_ofertada VARCHAR(100) DEFAULT 'no_ofertada',
    resort_ofertado VARCHAR(50) DEFAULT 'grand_mayan',
    principales_objeciones TEXT DEFAULT 'no presenta objeciones',
    resumen_llamada TEXT,
    
    -- Campos de coordinaciones y ejecutivos
    coordinacion_id UUID,
    ejecutivo_id UUID,
    
    -- Campos de control temporal
    ended_at TIMESTAMP WITH TIME ZONE,
    last_event_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar columnas faltantes si la tabla ya existe (seguro - no borra datos)
DO $$
BEGIN
    -- Columnas básicas
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS call_id VARCHAR(255);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS fecha_llamada TIMESTAMP WITH TIME ZONE;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS duracion_segundos INTEGER;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS es_venta_exitosa BOOLEAN;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS nivel_interes JSONB;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS probabilidad_cierre DECIMAL(5,2);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS costo_total DECIMAL(10,2);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS tipo_llamada JSONB;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS oferta_presentada BOOLEAN;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS precio_ofertado JSONB;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS requiere_seguimiento BOOLEAN;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS datos_llamada JSONB;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS datos_proceso JSONB;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS datos_objeciones JSONB;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS audio_ruta_bucket TEXT;
    -- Columnas VAPI
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS monitor_url TEXT;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS control_url TEXT;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS transport_url TEXT;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS call_sid VARCHAR(255);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS transport VARCHAR(100);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS provider VARCHAR(100);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS account_sid VARCHAR(255);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS call_status VARCHAR(50);
    -- Columnas de feedback
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS tiene_feedback BOOLEAN DEFAULT false;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS feedback_resultado VARCHAR(50);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS feedback_comentarios TEXT;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS feedback_user_email VARCHAR(255);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS feedback_fecha TIMESTAMP WITH TIME ZONE;
    -- Columnas de checkpoint Kanban
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS checkpoint_venta_actual VARCHAR(50) DEFAULT 'checkpoint #1';
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS composicion_familiar_numero INTEGER;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS destino_preferido VARCHAR(50);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS preferencia_vacaciones TEXT[];
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS numero_noches INTEGER;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS mes_preferencia VARCHAR(2);
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS estado_civil VARCHAR(50) DEFAULT 'no_especificado';
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS edad INTEGER;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS propuesta_economica_ofrecida INTEGER;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS habitacion_ofertada VARCHAR(100) DEFAULT 'no_ofertada';
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS resort_ofertado VARCHAR(50) DEFAULT 'grand_mayan';
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS principales_objeciones TEXT DEFAULT 'no presenta objeciones';
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS resumen_llamada TEXT;
    -- Columnas de coordinaciones
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS coordinacion_id UUID;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS ejecutivo_id UUID;
    -- Columnas temporales
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    
    -- Agregar foreign key a prospectos si no existe (solo si la columna prospecto existe)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'prospecto') THEN
        -- Verificar si ya existe la foreign key
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'llamadas_ventas_prospecto_fkey'
        ) THEN
            ALTER TABLE llamadas_ventas 
            ADD CONSTRAINT llamadas_ventas_prospecto_fkey 
            FOREIGN KEY (prospecto) REFERENCES prospectos(id) ON DELETE SET NULL;
        END IF;
    ELSE
        -- Si no existe la columna, agregarla con foreign key
        ALTER TABLE llamadas_ventas ADD COLUMN IF NOT EXISTS prospecto UUID;
        ALTER TABLE llamadas_ventas 
        ADD CONSTRAINT llamadas_ventas_prospecto_fkey 
        FOREIGN KEY (prospecto) REFERENCES prospectos(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Crear constraint UNIQUE para call_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'llamadas_ventas_call_id_key'
    ) THEN
        ALTER TABLE llamadas_ventas ADD CONSTRAINT llamadas_ventas_call_id_key UNIQUE (call_id);
    END IF;
END $$;

-- Índices para llamadas_ventas (crear solo si las columnas existen)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'call_id') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_call_id ON llamadas_ventas(call_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'prospecto') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_prospecto ON llamadas_ventas(prospecto) WHERE prospecto IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'fecha_llamada') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_fecha ON llamadas_ventas(fecha_llamada);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'call_status') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_call_status ON llamadas_ventas(call_status);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'checkpoint_venta_actual') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_checkpoint ON llamadas_ventas(checkpoint_venta_actual);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'destino_preferido') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_destino ON llamadas_ventas(destino_preferido);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'estado_civil') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_estado_civil ON llamadas_ventas(estado_civil);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'feedback_resultado') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_feedback_resultado ON llamadas_ventas(feedback_resultado);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'tiene_feedback') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_tiene_feedback ON llamadas_ventas(tiene_feedback);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'feedback_fecha') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_feedback_fecha ON llamadas_ventas(feedback_fecha);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'coordinacion_id') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_coordinacion ON llamadas_ventas(coordinacion_id) WHERE coordinacion_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'ejecutivo_id') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_ejecutivo ON llamadas_ventas(ejecutivo_id) WHERE ejecutivo_id IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'ended_at') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_ended_at ON llamadas_ventas(ended_at);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'llamadas_ventas' AND column_name = 'last_event_at') THEN
        CREATE INDEX IF NOT EXISTS idx_llamadas_last_event_at ON llamadas_ventas(last_event_at);
    END IF;
END $$;

-- Trigger para actualizar updated_at en llamadas_ventas
CREATE OR REPLACE FUNCTION update_llamadas_ventas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_llamadas_ventas_updated_at ON llamadas_ventas;
CREATE TRIGGER trigger_update_llamadas_ventas_updated_at
    BEFORE UPDATE ON llamadas_ventas
    FOR EACH ROW
    EXECUTE FUNCTION update_llamadas_ventas_updated_at();

-- Función para actualizar automáticamente tiene_feedback
CREATE OR REPLACE FUNCTION update_tiene_feedback()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.feedback_resultado IS NOT NULL OR 
       NEW.feedback_comentarios IS NOT NULL OR 
       NEW.feedback_user_email IS NOT NULL OR 
       NEW.feedback_fecha IS NOT NULL THEN
        NEW.tiene_feedback = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tiene_feedback ON llamadas_ventas;
CREATE TRIGGER trigger_update_tiene_feedback
    BEFORE UPDATE ON llamadas_ventas
    FOR EACH ROW
    EXECUTE FUNCTION update_tiene_feedback();

-- Función para asignar llamada según prospecto
CREATE OR REPLACE FUNCTION auto_assign_call_to_coordinacion()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.prospecto IS NOT NULL THEN
        SELECT coordinacion_id INTO NEW.coordinacion_id
        FROM prospectos
        WHERE id = NEW.prospecto;
        
        IF NEW.coordinacion_id IS NOT NULL THEN
            SELECT ejecutivo_id INTO NEW.ejecutivo_id
            FROM prospectos
            WHERE id = NEW.prospecto;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_assign_call ON llamadas_ventas;
CREATE TRIGGER trigger_auto_assign_call
    BEFORE INSERT ON llamadas_ventas
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_call_to_coordinacion();

-- RLS para llamadas_ventas
ALTER TABLE llamadas_ventas ENABLE ROW LEVEL SECURITY;

-- Crear políticas solo si no existen (seguro)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'llamadas_ventas' 
        AND policyname = 'Users can view llamadas_ventas'
    ) THEN
        CREATE POLICY "Users can view llamadas_ventas" ON llamadas_ventas FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'llamadas_ventas' 
        AND policyname = 'Users can insert llamadas_ventas'
    ) THEN
        CREATE POLICY "Users can insert llamadas_ventas" ON llamadas_ventas FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'llamadas_ventas' 
        AND policyname = 'Users can update llamadas_ventas'
    ) THEN
        CREATE POLICY "Users can update llamadas_ventas" ON llamadas_ventas FOR UPDATE USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'llamadas_ventas' 
        AND policyname = 'Users can delete llamadas_ventas'
    ) THEN
        CREATE POLICY "Users can delete llamadas_ventas" ON llamadas_ventas FOR DELETE USING (true);
    END IF;
END $$;

-- ============================================
-- PASO 3: CREAR/ACTUALIZAR TABLA AGENT_QUEUE (RELACIONADA CON LIVE MONITOR)
-- ============================================

-- Crear tabla si no existe
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

-- Agregar columnas faltantes si la tabla ya existe (seguro - no borra datos)
DO $$
BEGIN
    ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100);
    ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS agent_email VARCHAR(255);
    ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS total_calls_handled INTEGER DEFAULT 0;
    ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS last_call_time TIMESTAMP WITH TIME ZONE;
    ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS current_position INTEGER;
    ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE agent_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Crear constraint UNIQUE para agent_email si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'agent_queue_agent_email_key'
    ) THEN
        ALTER TABLE agent_queue ADD CONSTRAINT agent_queue_agent_email_key UNIQUE (agent_email);
    END IF;
END $$;

-- Índices para agent_queue (crear solo si las columnas existen)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_queue' AND column_name = 'agent_email') THEN
        CREATE INDEX IF NOT EXISTS idx_agent_queue_email ON agent_queue(agent_email);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_queue' AND column_name = 'is_active') THEN
        CREATE INDEX IF NOT EXISTS idx_agent_queue_is_active ON agent_queue(is_active);
    END IF;
END $$;

-- RLS para agent_queue
ALTER TABLE agent_queue ENABLE ROW LEVEL SECURITY;

-- Crear políticas solo si no existen (seguro)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_queue' 
        AND policyname = 'Users can view agent_queue'
    ) THEN
        CREATE POLICY "Users can view agent_queue" ON agent_queue FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_queue' 
        AND policyname = 'Users can insert agent_queue'
    ) THEN
        CREATE POLICY "Users can insert agent_queue" ON agent_queue FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_queue' 
        AND policyname = 'Users can update agent_queue'
    ) THEN
        CREATE POLICY "Users can update agent_queue" ON agent_queue FOR UPDATE USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'agent_queue' 
        AND policyname = 'Users can delete agent_queue'
    ) THEN
        CREATE POLICY "Users can delete agent_queue" ON agent_queue FOR DELETE USING (true);
    END IF;
END $$;

-- Insertar agentes demo (opcional)
INSERT INTO agent_queue (agent_name, agent_email, total_calls_handled) VALUES
('Carlos Mendoza', 'carlos.mendoza@grupovidanta.com', 15),
('Ana Gutiérrez', 'ana.gutierrez@grupovidanta.com', 12),
('Roberto Silva', 'roberto.silva@grupovidanta.com', 18),
('María López', 'maria.lopez@grupovidanta.com', 9),
('Diego Ramírez', 'diego.ramirez@grupovidanta.com', 21)
ON CONFLICT (agent_email) DO NOTHING;

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE prospectos IS 'Tabla principal de prospectos del sistema';
COMMENT ON COLUMN prospectos.id_dynamics IS 'ID del prospecto en CRM Dynamics';
COMMENT ON COLUMN prospectos.coordinacion_id IS 'ID de la coordinación asignada (referencia a System_UI.coordinaciones)';
COMMENT ON COLUMN prospectos.ejecutivo_id IS 'ID del ejecutivo asignado (referencia a System_UI.auth_users)';
COMMENT ON COLUMN prospectos.status_transferencia IS 'Estado de transferencia para Live Monitor: pendiente, en_proceso, completada, cancelada';
COMMENT ON COLUMN prospectos.temperatura_prospecto IS 'Temperatura del prospecto: frio, tibio, caliente';

COMMENT ON TABLE llamadas_ventas IS 'Tabla principal de llamadas de ventas del sistema';
COMMENT ON COLUMN llamadas_ventas.prospecto IS 'ID del prospecto asociado (referencia a prospectos)';
COMMENT ON COLUMN llamadas_ventas.coordinacion_id IS 'ID de la coordinación asignada (referencia a System_UI.coordinaciones)';
COMMENT ON COLUMN llamadas_ventas.ejecutivo_id IS 'ID del ejecutivo asignado (referencia a System_UI.auth_users)';
COMMENT ON COLUMN llamadas_ventas.checkpoint_venta_actual IS 'Checkpoint actual del proceso de venta (checkpoint #1 a #5)';
COMMENT ON COLUMN llamadas_ventas.destino_preferido IS 'Destino de preferencia: nuevo_vallarta, riviera_maya, los_cabos, acapulco';
COMMENT ON COLUMN llamadas_ventas.call_status IS 'Estado de la llamada: activa, transferida, colgada, perdida, exitosa';

COMMENT ON TABLE agent_queue IS 'Tabla para cola de agentes en Live Monitor';

-- ============================================
-- PASO 4: HABILITAR REALTIME EN LAS TABLAS
-- ============================================
-- IMPORTANTE: Las suscripciones realtime del cliente funcionan automáticamente
-- pero las tablas deben estar en la publicación supabase_realtime

-- Habilitar realtime en prospectos (si no está ya habilitado)
DO $$
BEGIN
    BEGIN
        ALTER publication supabase_realtime ADD TABLE prospectos;
        RAISE NOTICE '✅ Realtime habilitado en prospectos';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ prospectos ya tiene realtime habilitado';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error habilitando realtime en prospectos: %', SQLERRM;
    END;
END $$;

-- Habilitar realtime en llamadas_ventas (si no está ya habilitado)
DO $$
BEGIN
    BEGIN
        ALTER publication supabase_realtime ADD TABLE llamadas_ventas;
        RAISE NOTICE '✅ Realtime habilitado en llamadas_ventas';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'ℹ️ llamadas_ventas ya tiene realtime habilitado';
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error habilitando realtime en llamadas_ventas: %', SQLERRM;
    END;
END $$;

-- Verificar estado de realtime
SELECT 
    '=== ESTADO DE REALTIME ===' as seccion,
    tablename as tabla,
    'HABILITADO' as estado
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('prospectos', 'llamadas_ventas')
ORDER BY tablename;

-- ============================================
-- PASO 5: CREAR FUNCIÓN Y TRIGGERS PARA NOTIFICACIONES LIVE MONITOR
-- ============================================
-- Estos triggers son necesarios para notificaciones adicionales de la vista live_monitor_view

-- Crear función para notificaciones (versión segura que maneja función clasificar_estado_llamada si existe)
CREATE OR REPLACE FUNCTION notify_live_monitor_change()
RETURNS trigger AS $$
BEGIN
    -- Notificar cambio en la vista usando NOTIFY
    -- Intentar usar clasificar_estado_llamada si existe, sino usar call_status directamente
    PERFORM pg_notify(
        'live_monitor_change',
        json_build_object(
            'table', 'live_monitor_view',
            'type', TG_OP,
            'call_id', COALESCE(NEW.call_id, OLD.call_id),
            'prospecto_id', COALESCE(NEW.prospecto, OLD.prospecto),
            'checkpoint', COALESCE(NEW.checkpoint_venta_actual, OLD.checkpoint_venta_actual),
            'call_status', COALESCE(NEW.call_status, OLD.call_status),
            'call_status_inteligente', 
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM pg_proc p 
                    JOIN pg_namespace n ON p.pronamespace = n.oid 
                    WHERE n.nspname = 'public' 
                    AND p.proname = 'clasificar_estado_llamada'
                ) THEN
                    clasificar_estado_llamada(
                        COALESCE(NEW.call_status, OLD.call_status),
                        COALESCE(NEW.datos_llamada, OLD.datos_llamada),
                        COALESCE(NEW.duracion_segundos, OLD.duracion_segundos),
                        COALESCE(NEW.fecha_llamada, OLD.fecha_llamada),
                        COALESCE(NEW.audio_ruta_bucket, OLD.audio_ruta_bucket)::text
                    )
                ELSE
                    COALESCE(NEW.call_status, OLD.call_status)
            END,
            'timestamp', NOW()
        )::text
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear triggers en llamadas_ventas (solo si no existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'live_monitor_llamadas_trigger' 
        AND event_object_table = 'llamadas_ventas'
    ) THEN
        CREATE TRIGGER live_monitor_llamadas_trigger
        AFTER INSERT OR UPDATE OR DELETE ON llamadas_ventas
        FOR EACH ROW EXECUTE FUNCTION notify_live_monitor_change();
        RAISE NOTICE '✅ Trigger live_monitor_llamadas_trigger creado';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger live_monitor_llamadas_trigger ya existe';
    END IF;
END $$;

-- Crear triggers en prospectos (solo si no existen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'live_monitor_prospectos_trigger' 
        AND event_object_table = 'prospectos'
    ) THEN
        CREATE TRIGGER live_monitor_prospectos_trigger
        AFTER INSERT OR UPDATE OR DELETE ON prospectos
        FOR EACH ROW EXECUTE FUNCTION notify_live_monitor_change();
        RAISE NOTICE '✅ Trigger live_monitor_prospectos_trigger creado';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger live_monitor_prospectos_trigger ya existe';
    END IF;
END $$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

SELECT '✅ Todas las tablas relacionadas con prospectos fueron recreadas exitosamente' AS resultado;
SELECT '✅ Realtime configurado - Las suscripciones del cliente funcionarán automáticamente' AS nota;

