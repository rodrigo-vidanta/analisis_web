-- ============================================
-- ENCONTRAR USUARIO RODRIGO MORA EN TABLAS REALES
-- ============================================

-- 1. Buscar en auth_users (tabla real del sistema)
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.full_name,
    r.name as role_name,
    u.is_active,
    u.created_at,
    u.last_login
FROM auth_users u
LEFT JOIN auth_roles r ON u.role_id = r.id
WHERE u.email ILIKE '%rodrigo%' 
   OR u.first_name ILIKE '%rodrigo%'
   OR u.last_name ILIKE '%mora%'
   OR u.full_name ILIKE '%rodrigo%'
   OR u.full_name ILIKE '%mora%';

-- 2. Listar todos los roles disponibles
SELECT id, name, display_name, description 
FROM auth_roles 
ORDER BY name;

-- 3. Verificar si existe rol 'vendedor'
SELECT id, name, display_name 
FROM auth_roles 
WHERE name = 'vendedor';

-- 4. Si no existe el rol vendedor, crearlo
INSERT INTO auth_roles (name, display_name, description) 
VALUES ('vendedor', 'Vendedor', 'Personal de ventas con acceso a Live Monitor')
ON CONFLICT (name) DO NOTHING;

-- 5. Listar los últimos 10 usuarios para ver la estructura
SELECT 
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    u.is_active
FROM auth_users u
LEFT JOIN auth_roles r ON u.role_id = r.id
ORDER BY u.created_at DESC
LIMIT 10;

SELECT 'Búsqueda de Rodrigo Mora en tablas reales completada' AS resultado;
