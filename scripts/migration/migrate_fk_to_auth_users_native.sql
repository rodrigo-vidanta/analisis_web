-- ============================================
-- MIGRACIÓN: FK de user_permission_groups a auth.users nativo
-- ============================================
-- Fecha: 2026-01-20
-- Propósito: Eliminar dependencia de tabla legacy auth_users
-- Downtime: NINGUNO (operación DDL atómica)
-- ============================================

-- 1. Verificar constraints actuales
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT constraint_name INTO v_constraint_name
  FROM information_schema.table_constraints
  WHERE table_name = 'user_permission_groups'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%user_id%';
  
  IF v_constraint_name IS NOT NULL THEN
    RAISE NOTICE '📋 Constraint actual encontrado: %', v_constraint_name;
  ELSE
    RAISE NOTICE '⚠️ No se encontró FK existente para user_id';
  END IF;
END $$;

-- 2. Eliminar FK actual (apunta a public.auth_users)
ALTER TABLE public.user_permission_groups 
DROP CONSTRAINT IF EXISTS user_permission_groups_user_id_fkey;

ALTER TABLE public.user_permission_groups 
DROP CONSTRAINT IF EXISTS fk_user_permission_groups_user_id;

-- 3. Crear nueva FK (apunta a auth.users nativo de Supabase)
ALTER TABLE public.user_permission_groups 
ADD CONSTRAINT user_permission_groups_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Verificar migración exitosa
DO $$
DECLARE
  v_ref_table TEXT;
BEGIN
  SELECT ccu.table_schema || '.' || ccu.table_name INTO v_ref_table
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'user_permission_groups'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_name = 'user_permission_groups_user_id_fkey';
  
  IF v_ref_table = 'auth.users' THEN
    RAISE NOTICE '✅ MIGRACIÓN EXITOSA: FK ahora apunta a auth.users';
  ELSE
    RAISE NOTICE '❌ ERROR: FK apunta a % (esperado: auth.users)', v_ref_table;
  END IF;
END $$;

-- 5. Comentario de auditoría
COMMENT ON CONSTRAINT user_permission_groups_user_id_fkey 
ON public.user_permission_groups 
IS 'FK migrada de public.auth_users a auth.users nativo - 2026-01-20';
