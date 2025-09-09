-- ============================================
-- SCRIPT SIMPLIFICADO PARA LIVE MONITOR
-- Base: hmmfuhqgvsehkizlfzga.supabase.co
-- Fecha: 2025-01-24
-- ============================================

-- EJECUTAR ESTOS COMANDOS UNO POR UNO

-- 1. Verificar estructura de auth_roles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'auth_roles' 
ORDER BY ordinal_position;

-- 2. Crear rol vendedor (estructura básica)
INSERT INTO auth_roles (id, name, display_name, description)
VALUES (
    gen_random_uuid(),
    'vendedor',
    'Vendedor',
    'Vendedor con acceso a monitor en vivo'
) ON CONFLICT (name) DO NOTHING;

-- 3. Verificar estructura de auth_permissions  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'auth_permissions' 
ORDER BY ordinal_position;

-- 4. Crear permiso para Live Monitor (estructura básica)
INSERT INTO auth_permissions (id, permission_name, module, sub_module, permission_description)
VALUES (
    gen_random_uuid(),
    'view_live_monitor',
    'analisis',
    'live_monitor',
    'Ver monitor de llamadas en tiempo real'
) ON CONFLICT (permission_name, module, sub_module) DO NOTHING;

-- 5. Verificar que se crearon
SELECT name, display_name FROM auth_roles WHERE name = 'vendedor';
SELECT permission_name, module, sub_module FROM auth_permissions WHERE permission_name = 'view_live_monitor';

-- ============================================
-- ASIGNAR PERMISOS (OPCIONAL)
-- ============================================

-- 6. Asignar permiso a admin
INSERT INTO auth_role_permissions (role_id, permission_id, granted_at)
SELECT 
    r.id,
    p.id,
    NOW()
FROM auth_roles r, auth_permissions p
WHERE r.name = 'admin' 
    AND p.permission_name = 'view_live_monitor'
    AND NOT EXISTS (
        SELECT 1 FROM auth_role_permissions rp 
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );

-- 7. Asignar permiso a vendedor
INSERT INTO auth_role_permissions (role_id, permission_id, granted_at)
SELECT 
    r.id,
    p.id,
    NOW()
FROM auth_roles r, auth_permissions p
WHERE r.name = 'vendedor' 
    AND p.permission_name = 'view_live_monitor'
    AND NOT EXISTS (
        SELECT 1 FROM auth_role_permissions rp 
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
    );

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- 8. Ver todos los roles
SELECT id, name, display_name, description FROM auth_roles ORDER BY name;

-- 9. Ver permisos de Live Monitor
SELECT 
    r.name as role_name,
    p.permission_name,
    p.module,
    p.sub_module
FROM auth_roles r
JOIN auth_role_permissions rp ON r.id = rp.role_id
JOIN auth_permissions p ON rp.permission_id = p.id
WHERE p.permission_name = 'view_live_monitor';
