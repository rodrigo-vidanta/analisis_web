-- ============================================
-- ENCONTRAR TABLAS DE AUTENTICACIÓN EXISTENTES
-- ============================================

-- 1. Listar todas las tablas que podrían contener información de usuarios
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%user%' 
    OR table_name LIKE '%auth%' 
    OR table_name LIKE '%profile%'
    OR table_name LIKE '%role%'
    OR table_name LIKE '%permission%')
ORDER BY table_name;

-- 2. Si existe auth.users (Supabase estándar), mostrar estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Si existe public.profiles, mostrar estructura
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Buscar usuario rodrigo en cualquier tabla que pueda contenerlo
-- (Este query fallará si las tablas no existen, pero nos dará información)

-- Intentar en auth.users de Supabase
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        RAISE NOTICE 'Buscando en auth.users:';
        PERFORM * FROM auth.users WHERE email ILIKE '%rodrigo%' OR raw_user_meta_data->>'first_name' ILIKE '%rodrigo%';
    END IF;
END $$;

-- Intentar en public.profiles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE NOTICE 'Buscando en public.profiles:';
        PERFORM * FROM public.profiles WHERE email ILIKE '%rodrigo%' OR first_name ILIKE '%rodrigo%';
    END IF;
END $$;

SELECT 'Búsqueda de tablas de autenticación completada' AS resultado;
