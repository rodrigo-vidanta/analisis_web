-- ============================================
-- ENCONTRAR USUARIO RODRIGO MORA - SUPABASE ESTÁNDAR
-- ============================================

-- 1. Buscar en auth.users (tabla estándar de Supabase)
SELECT 
    id,
    email,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name,
    raw_user_meta_data->>'role' as role_name,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users 
WHERE email ILIKE '%rodrigo%' 
   OR raw_user_meta_data->>'first_name' ILIKE '%rodrigo%'
   OR raw_user_meta_data->>'last_name' ILIKE '%mora%';

-- 2. Si existe tabla profiles, buscar ahí también
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    created_at,
    updated_at
FROM public.profiles 
WHERE email ILIKE '%rodrigo%' 
   OR first_name ILIKE '%rodrigo%'
   OR last_name ILIKE '%mora%';

-- 3. Listar todos los usuarios para ver la estructura
SELECT 
    email,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'role' as role_name,
    created_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 10;

SELECT 'Búsqueda de Rodrigo Mora completada' AS resultado;
