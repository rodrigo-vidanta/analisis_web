-- Script para actualizar usuarios de Vidanta
-- Fecha: 2026-01-22
-- Descripción: Actualiza teléfono, coordinación y rol de usuarios específicos

-- Mapeo de coordinaciones (ya obtenidos)
-- VEN: 3f41a10b-60b1-4c2b-b097-a83968353af5
-- MVP: 4c1ece41-bb6b-49a1-b52b-f5236f54d60a
-- APEX: f33742b9-46cf-4716-bf7a-ce129a82bad2
-- COB ACA: 0008460b-a730-4f0b-ac1b-5aaa5c40f5b0

-- Mapeo de roles (ya obtenidos)
-- coordinador: c2984ef8-d8bc-489d-9758-41be8f7fd2bb
-- ejecutivo: fed8bd96-7928-4a3e-bb20-e20384e98f0b
-- supervisor: 6b9aba23-0f1c-416c-add6-7c0424f21116

-- ============================================
-- FUNCIÓN AUXILIAR PARA ACTUALIZAR USER METADATA
-- ============================================
CREATE OR REPLACE FUNCTION update_user_metadata_safe(
  p_user_id UUID,
  p_metadata JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  current_metadata JSONB;
BEGIN
  -- Obtener metadata actual
  SELECT raw_user_meta_data INTO current_metadata
  FROM auth.users
  WHERE id = p_user_id;
  
  IF current_metadata IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', p_user_id;
  END IF;
  
  -- Actualizar metadata (merge)
  UPDATE auth.users
  SET raw_user_meta_data = current_metadata || p_metadata,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error actualizando usuario %: %', p_user_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ACTUALIZACIONES DE USUARIOS
-- ============================================

-- 1. paolamaldonado@vidavacations.com - VEN - Coordinador
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE LOWER(email) = LOWER('paolamaldonado@vidavacations.com');
  
  IF user_id IS NOT NULL THEN
    PERFORM update_user_metadata_safe(
      user_id,
      jsonb_build_object(
        'phone', '+16232533583',
        'coordinacion_id', '3f41a10b-60b1-4c2b-b097-a83968353af5',
        'role_id', 'c2984ef8-d8bc-489d-9758-41be8f7fd2bb',
        'is_coordinator', true,
        'is_ejecutivo', false,
        'updated_at', NOW()::text
      )
    );
    RAISE NOTICE '✅ Actualizado: paolamaldonado@vidavacations.com';
  ELSE
    RAISE WARNING '⚠️ Usuario no encontrado: paolamaldonado@vidavacations.com';
  END IF;
END $$;

-- 2. taydevera@vidavacations.com - MVP - Ejecutivo
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE LOWER(email) = LOWER('taydevera@vidavacations.com');
  
  IF user_id IS NOT NULL THEN
    PERFORM update_user_metadata_safe(
      user_id,
      jsonb_build_object(
        'phone', '+16232533584',
        'coordinacion_id', '4c1ece41-bb6b-49a1-b52b-f5236f54d60a',
        'role_id', 'fed8bd96-7928-4a3e-bb20-e20384e98f0b',
        'is_coordinator', false,
        'is_ejecutivo', true,
        'updated_at', NOW()::text
      )
    );
    RAISE NOTICE '✅ Actualizado: taydevera@vidavacations.com';
  ELSE
    RAISE WARNING '⚠️ Usuario no encontrado: taydevera@vidavacations.com';
  END IF;
END $$;

-- 3. irvingaquino@vidavacations.com - MVP - Supervisor
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE LOWER(email) = LOWER('irvingaquino@vidavacations.com');
  
  IF user_id IS NOT NULL THEN
    PERFORM update_user_metadata_safe(
      user_id,
      jsonb_build_object(
        'phone', '+16232536849',
        'coordinacion_id', '4c1ece41-bb6b-49a1-b52b-f5236f54d60a',
        'role_id', '6b9aba23-0f1c-416c-add6-7c0424f21116',
        'is_coordinator', false,
        'is_ejecutivo', false,
        'updated_at', NOW()::text
      )
    );
    RAISE NOTICE '✅ Actualizado: irvingaquino@vidavacations.com';
  ELSE
    RAISE WARNING '⚠️ Usuario no encontrado: irvingaquino@vidavacations.com';
  END IF;
END $$;

-- 4. mayragonzalezs@vidavacations.com - VEN - Ejecutivo
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE LOWER(email) = LOWER('mayragonzalezs@vidavacations.com');
  
  IF user_id IS NOT NULL THEN
    PERFORM update_user_metadata_safe(
      user_id,
      jsonb_build_object(
        'phone', '+16232536853',
        'coordinacion_id', '3f41a10b-60b1-4c2b-b097-a83968353af5',
        'role_id', 'fed8bd96-7928-4a3e-bb20-e20384e98f0b',
        'is_coordinator', false,
        'is_ejecutivo', true,
        'updated_at', NOW()::text
      )
    );
    RAISE NOTICE '✅ Actualizado: mayragonzalezs@vidavacations.com';
  ELSE
    RAISE WARNING '⚠️ Usuario no encontrado: mayragonzalezs@vidavacations.com';
  END IF;
END $$;

-- 5. isselrico@vidavacations.com - VEN - Supervisor
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE LOWER(email) = LOWER('isselrico@vidavacations.com');
  
  IF user_id IS NOT NULL THEN
    PERFORM update_user_metadata_safe(
      user_id,
      jsonb_build_object(
        'phone', '+16232536854',
        'coordinacion_id', '3f41a10b-60b1-4c2b-b097-a83968353af5',
        'role_id', '6b9aba23-0f1c-416c-add6-7c0424f21116',
        'is_coordinator', false,
        'is_ejecutivo', false,
        'updated_at', NOW()::text
      )
    );
    RAISE NOTICE '✅ Actualizado: isselrico@vidavacations.com';
  ELSE
    RAISE WARNING '⚠️ Usuario no encontrado: isselrico@vidavacations.com';
  END IF;
END $$;

-- 6. keniamartineza@vidavacations.com - APEX - Ejecutivo
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE LOWER(email) = LOWER('keniamartineza@vidavacations.com');
  
  IF user_id IS NOT NULL THEN
    PERFORM update_user_metadata_safe(
      user_id,
      jsonb_build_object(
        'phone', '+16232536875',
        'coordinacion_id', 'f33742b9-46cf-4716-bf7a-ce129a82bad2',
        'role_id', 'fed8bd96-7928-4a3e-bb20-e20384e98f0b',
        'is_coordinator', false,
        'is_ejecutivo', true,
        'updated_at', NOW()::text
      )
    );
    RAISE NOTICE '✅ Actualizado: keniamartineza@vidavacations.com';
  ELSE
    RAISE WARNING '⚠️ Usuario no encontrado: keniamartineza@vidavacations.com';
  END IF;
END $$;

-- 7. robertoraya@vidavacations.com - APEX - Supervisor
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE LOWER(email) = LOWER('robertoraya@vidavacations.com');
  
  IF user_id IS NOT NULL THEN
    PERFORM update_user_metadata_safe(
      user_id,
      jsonb_build_object(
        'phone', '+16232536877',
        'coordinacion_id', 'f33742b9-46cf-4716-bf7a-ce129a82bad2',
        'role_id', '6b9aba23-0f1c-416c-add6-7c0424f21116',
        'is_coordinator', false,
        'is_ejecutivo', false,
        'updated_at', NOW()::text
      )
    );
    RAISE NOTICE '✅ Actualizado: robertoraya@vidavacations.com';
  ELSE
    RAISE WARNING '⚠️ Usuario no encontrado: robertoraya@vidavacations.com';
  END IF;
END $$;

-- 8. manuelgomezp@vidavacations.com - COB ACA - Supervisor
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE LOWER(email) = LOWER('manuelgomezp@vidavacations.com');
  
  IF user_id IS NOT NULL THEN
    PERFORM update_user_metadata_safe(
      user_id,
      jsonb_build_object(
        'phone', '+16232536880',
        'coordinacion_id', '0008460b-a730-4f0b-ac1b-5aaa5c40f5b0',
        'role_id', '6b9aba23-0f1c-416c-add6-7c0424f21116',
        'is_coordinator', false,
        'is_ejecutivo', false,
        'updated_at', NOW()::text
      )
    );
    RAISE NOTICE '✅ Actualizado: manuelgomezp@vidavacations.com';
  ELSE
    RAISE WARNING '⚠️ Usuario no encontrado: manuelgomezp@vidavacations.com';
  END IF;
END $$;

-- 9. jessicagutierrez@vidavacations.com - COB ACA - Ejecutivo
DO $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE LOWER(email) = LOWER('jessicagutierrez@vidavacations.com');
  
  IF user_id IS NOT NULL THEN
    PERFORM update_user_metadata_safe(
      user_id,
      jsonb_build_object(
        'phone', '+16232536882',
        'coordinacion_id', '0008460b-a730-4f0b-ac1b-5aaa5c40f5b0',
        'role_id', 'fed8bd96-7928-4a3e-bb20-e20384e98f0b',
        'is_coordinator', false,
        'is_ejecutivo', true,
        'updated_at', NOW()::text
      )
    );
    RAISE NOTICE '✅ Actualizado: jessicagutierrez@vidavacations.com';
  ELSE
    RAISE WARNING '⚠️ Usuario no encontrado: jessicagutierrez@vidavacations.com';
  END IF;
END $$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT 
  email,
  raw_user_meta_data->>'phone' as phone,
  raw_user_meta_data->>'coordinacion_id' as coordinacion_id,
  raw_user_meta_data->>'role_id' as role_id,
  raw_user_meta_data->>'is_coordinator' as is_coordinator,
  raw_user_meta_data->>'is_ejecutivo' as is_ejecutivo
FROM auth.users
WHERE LOWER(email) IN (
  LOWER('paolamaldonado@vidavacations.com'),
  LOWER('taydevera@vidavacations.com'),
  LOWER('irvingaquino@vidavacations.com'),
  LOWER('mayragonzalezs@vidavacations.com'),
  LOWER('isselrico@vidavacations.com'),
  LOWER('keniamartineza@vidavacations.com'),
  LOWER('robertoraya@vidavacations.com'),
  LOWER('manuelgomezp@vidavacations.com'),
  LOWER('jessicagutierrez@vidavacations.com')
)
ORDER BY email;
