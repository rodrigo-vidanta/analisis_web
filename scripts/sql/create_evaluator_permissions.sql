-- ============================================
-- CREAR TABLA DE PERMISOS ESPECÍFICOS PARA EVALUADORES
-- ============================================

-- Tabla para almacenar permisos específicos de evaluadores
CREATE TABLE IF NOT EXISTS evaluator_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth_users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    natalia_access BOOLEAN DEFAULT FALSE,
    pqnc_access BOOLEAN DEFAULT FALSE,
    live_monitor_access BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth_users(id),
    UNIQUE(user_id)
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_evaluator_permissions_user_id ON evaluator_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_permissions_email ON evaluator_permissions(user_email);
CREATE INDEX IF NOT EXISTS idx_evaluator_permissions_live_monitor ON evaluator_permissions(live_monitor_access);

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_evaluator_permissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
DROP TRIGGER IF EXISTS trigger_update_evaluator_permissions_timestamp ON evaluator_permissions;
CREATE TRIGGER trigger_update_evaluator_permissions_timestamp
    BEFORE UPDATE ON evaluator_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_evaluator_permissions_timestamp();

-- Insertar permisos para Rodrigo Mora (ajustar email según sea necesario)
INSERT INTO evaluator_permissions (
    user_id,
    user_email,
    natalia_access,
    pqnc_access,
    live_monitor_access
) 
SELECT 
    u.id,
    u.email,
    true,  -- acceso a natalia
    true,  -- acceso a pqnc
    true   -- acceso a live monitor
FROM auth_users u
WHERE u.email ILIKE '%rodrigo%' 
   OR u.first_name ILIKE '%rodrigo%'
   OR u.last_name ILIKE '%mora%'
   OR u.full_name ILIKE '%rodrigo%'
ON CONFLICT (user_id) DO UPDATE SET
    live_monitor_access = true,
    updated_at = NOW();

-- Verificar que se crearon los permisos
SELECT 
    ep.user_email,
    ep.natalia_access,
    ep.pqnc_access,
    ep.live_monitor_access,
    u.first_name,
    u.last_name,
    r.name as role_name
FROM evaluator_permissions ep
JOIN auth_users u ON ep.user_id = u.id
LEFT JOIN auth_roles r ON u.role_id = r.id;

SELECT 'Tabla evaluator_permissions creada y permisos configurados' AS resultado;
