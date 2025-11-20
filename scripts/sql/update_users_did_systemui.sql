-- ============================================
-- ACTUALIZAR DIDs DE USUARIOS EN SYSTEMUI
-- Base: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Formato requerido por VAPI: +1XXXXXXXXXX
-- ============================================

-- ✅ TODOS LOS USUARIOS ACTUALIZADOS:
-- 1. María Fernanda Mondragón López (027564)
--    fernandamondragon@vidavacations.com → +16232533325 (PQNC_AI_1)
-- 2. Angélica Guzmán Velasco (035149)
--    angelicaguzman@vidavacations.com → +16232533579 (PQNC_AI_2)
-- 3. Vanessa Valentina Pérez Moreno (034646)
--    Vanessaperez@vidavacations.com → +16232533580 (PQNC_AI_3)
-- 4. Elizabeth Hernández Ramírez (034458)
--    Elizabethhernandez@vidavacations.com → +16232533583 (PQNC_AI_4)

-- ============================================
-- ACTUALIZAR DIDs PARA TODOS LOS USUARIOS
-- ============================================

-- Actualizar DID para María Fernanda Mondragón López
-- Skill: PQNC_AI_1, DID: 6232533325 → +16232533325
UPDATE auth_users
SET phone = '+16232533325',
    updated_at = NOW()
WHERE email ILIKE 'fernandamondragon@vidavacations.com';

-- Actualizar DID para Angélica Guzmán Velasco
-- Skill: PQNC_AI_2, DID: 6232533579 → +16232533579
UPDATE auth_users
SET phone = '+16232533579',
    updated_at = NOW()
WHERE email ILIKE 'angelicaguzman@vidavacations.com';

-- Actualizar DID para Vanessa Valentina Pérez Moreno
-- Skill: PQNC_AI_3, DID: 6232533580 → +16232533580
UPDATE auth_users
SET phone = '+16232533580',
    updated_at = NOW()
WHERE email ILIKE 'Vanessaperez@vidavacations.com';

-- Actualizar DID para Elizabeth Hernández Ramírez
-- Skill: PQNC_AI_4, DID: 6232533583 → +16232533583
UPDATE auth_users
SET phone = '+16232533583',
    updated_at = NOW()
WHERE email ILIKE 'Elizabethhernandez@vidavacations.com';

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
    email,
    phone,
    full_name,
    id_colaborador,
    updated_at
FROM auth_users
WHERE email ILIKE ANY(ARRAY[
    'fernandamondragon@vidavacations.com',
    'angelicaguzman@vidavacations.com',
    'Vanessaperez@vidavacations.com',
    'Elizabethhernandez@vidavacations.com'
])
ORDER BY email;
