-- ============================================
-- FIX MASIVO: Sincronizar coordinacion_id para coordinadores
-- ============================================
-- Fecha: 29 de Enero 2026
-- Problema: 6 coordinadores tienen coordinacion_id = null en auth.users.raw_user_meta_data
-- Solución: Actualizar usando la coordinación de auth_user_coordinaciones

-- ============================================
-- VERIFICACIÓN PRE-FIX
-- ============================================

SELECT 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role_name' as role_name,
  raw_user_meta_data->>'coordinacion_id' as coordinacion_id_actual
FROM auth.users
WHERE email IN (
  'diegobarba@vidavacations.com',
  'paolamaldonado@vidavacations.com',
  'fernandamondragon@vidavacations.com',
  'angelicaguzman@vidavacations.com',
  'vanessaperez@vidavacations.com',
  'elizabethhernandez@vidavacations.com'
)
ORDER BY email;

-- ============================================
-- APLICAR FIXES INDIVIDUALES
-- ============================================

-- 1. Diego Barba → APEX (f33742b9-46cf-4716-bf7a-ce129a82bad2)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{coordinacion_id}',
  '"f33742b9-46cf-4716-bf7a-ce129a82bad2"'::jsonb
)
WHERE email = 'diegobarba@vidavacations.com';

-- 2. Paola Maldonado → GDLM (3f41a10b-60b1-4c2b-b097-a83968353af5)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{coordinacion_id}',
  '"3f41a10b-60b1-4c2b-b097-a83968353af5"'::jsonb
)
WHERE email = 'paolamaldonado@vidavacations.com';

-- 3. Fernanda Mondragón → MX CORP (eea1c2ff-b50c-48ba-a694-0dc4c96706ca)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{coordinacion_id}',
  '"eea1c2ff-b50c-48ba-a694-0dc4c96706ca"'::jsonb
)
WHERE email = 'fernandamondragon@vidavacations.com';

-- 4. Angélica Guzmán → MX CORP (eea1c2ff-b50c-48ba-a694-0dc4c96706ca)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{coordinacion_id}',
  '"eea1c2ff-b50c-48ba-a694-0dc4c96706ca"'::jsonb
)
WHERE email = 'angelicaguzman@vidavacations.com';

-- 5. Vanessa Pérez → MX CORP (eea1c2ff-b50c-48ba-a694-0dc4c96706ca)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{coordinacion_id}',
  '"eea1c2ff-b50c-48ba-a694-0dc4c96706ca"'::jsonb
)
WHERE email = 'vanessaperez@vidavacations.com';

-- 6. Elizabeth Hernández → MX CORP (eea1c2ff-b50c-48ba-a694-0dc4c96706ca)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{coordinacion_id}',
  '"eea1c2ff-b50c-48ba-a694-0dc4c96706ca"'::jsonb
)
WHERE email = 'elizabethhernandez@vidavacations.com';

-- ============================================
-- VERIFICACIÓN POST-FIX
-- ============================================

SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.raw_user_meta_data->>'coordinacion_id' as coordinacion_id_actualizado,
  c.nombre as coordinacion_nombre,
  c.codigo as coordinacion_codigo
FROM auth.users au
LEFT JOIN coordinaciones c ON c.id = (au.raw_user_meta_data->>'coordinacion_id')::uuid
WHERE au.email IN (
  'diegobarba@vidavacations.com',
  'paolamaldonado@vidavacations.com',
  'fernandamondragon@vidavacations.com',
  'angelicaguzman@vidavacations.com',
  'vanessaperez@vidavacations.com',
  'elizabethhernandez@vidavacations.com'
)
ORDER BY au.email;

-- ============================================
-- RESUMEN DE COORDINACIONES
-- ============================================

-- Verificar que todas las coordinaciones existen
SELECT id, nombre, codigo
FROM coordinaciones
WHERE id IN (
  'f33742b9-46cf-4716-bf7a-ce129a82bad2', -- APEX
  '3f41a10b-60b1-4c2b-b097-a83968353af5', -- GDLM
  'eea1c2ff-b50c-48ba-a694-0dc4c96706ca'  -- MX CORP
);

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- 
-- Después de ejecutar este script:
-- ✅ Diego Barba tendrá coordinacion_id = APEX
-- ✅ Paola Maldonado tendrá coordinacion_id = GDLM  
-- ✅ Los 4 restantes tendrán coordinacion_id = MX CORP
--
-- Los usuarios deben cerrar sesión y volver a iniciar para que los cambios tengan efecto
--
-- ============================================
