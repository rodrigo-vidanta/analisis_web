-- ============================================
-- VERIFICAR Y ACTUALIZAR ACCESO DE USUARIO RODRIGO MORA
-- ============================================

-- 1. Verificar usuario actual
SELECT 
    id, 
    email, 
    first_name, 
    last_name, 
    role_name,
    is_active,
    created_at
FROM auth_user_profiles 
WHERE email ILIKE '%rodrigo%' OR first_name ILIKE '%rodrigo%' OR last_name ILIKE '%mora%';

-- 2. Verificar roles disponibles
SELECT role_name, description 
FROM auth_roles 
ORDER BY role_name;

-- 3. Verificar permisos del rol vendedor
SELECT 
    r.role_name,
    p.permission_name,
    p.module,
    p.sub_module,
    p.description
FROM auth_roles r
LEFT JOIN auth_role_permissions rp ON r.id = rp.role_id
LEFT JOIN auth_permissions p ON rp.permission_id = p.id
WHERE r.role_name = 'vendedor'
ORDER BY p.module, p.permission_name;

-- 4. Si el usuario existe pero no tiene el rol correcto, actualizarlo
-- DESCOMENTA LA SIGUIENTE LÍNEA DESPUÉS DE VERIFICAR EL EMAIL EXACTO:
-- UPDATE auth_user_profiles 
-- SET role_name = 'vendedor'
-- WHERE email = 'email_exacto_de_rodrigo_mora@dominio.com';

-- 5. Si el usuario no existe, crearlo (ajusta los datos según corresponda)
-- DESCOMENTA Y AJUSTA LOS DATOS DESPUÉS DE VERIFICAR:
-- INSERT INTO auth_user_profiles (
--     email, 
--     first_name, 
--     last_name, 
--     role_name, 
--     is_active,
--     password_hash,
--     created_at
-- ) VALUES (
--     'rodrigo.mora@grupovidanta.com',
--     'Rodrigo',
--     'Mora',
--     'vendedor',
--     true,
--     '$2b$10$ejemplo_hash_aqui', -- Reemplazar con hash real
--     NOW()
-- );

-- 6. Verificar que el rol vendedor tiene los permisos necesarios para Live Monitor
-- Si no existe el rol, crearlo:
-- INSERT INTO auth_roles (role_name, description) 
-- VALUES ('vendedor', 'Personal de ventas con acceso a Live Monitor')
-- ON CONFLICT (role_name) DO NOTHING;

SELECT 'Verificación de acceso de Rodrigo Mora completada' AS resultado;
