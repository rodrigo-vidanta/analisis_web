-- ============================================
-- VERIFICACIÓN RLS: conversaciones_whatsapp
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Problema: Mayra ve conversaciones de BOOM

-- 1. Verificar si RLS está habilitado
SELECT 
  '=== ESTADO DE RLS ===' as seccion,
  tablename, 
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS DESHABILITADO (PROBLEMA)'
  END as estado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'conversaciones_whatsapp';

-- 2. Ver políticas actuales (si existen)
SELECT 
  '=== POLÍTICAS ACTUALES ===' as seccion,
  polname as nombre_politica,
  polcmd as comando,
  polroles::regrole[] as roles,
  polpermissive as permissive,
  qual as condicion_using,
  with_check as condicion_check
FROM pg_policy 
WHERE polrelid = 'conversaciones_whatsapp'::regclass;

-- 3. Ver grants actuales
SELECT 
  '=== GRANTS ACTUALES ===' as seccion,
  grantee as rol,
  privilege_type as privilegio
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name = 'conversaciones_whatsapp'
ORDER BY grantee, privilege_type;

-- ============================================
-- SOLUCIÓN SI RLS ESTÁ DESHABILITADO
-- ============================================
-- ⚠️ UNCOMMENT SOLO SI LA QUERY ANTERIOR MUESTRA rls_enabled = false

/*
-- Paso 1: Habilitar RLS
ALTER TABLE conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;

-- Paso 2: Crear política para ejecutivos (solo ven sus conversaciones)
CREATE POLICY "Ejecutivos ven solo conversaciones de su coordinación"
ON conversaciones_whatsapp
FOR SELECT
TO authenticated
USING (
  -- Admin y Administrador Operativo ven todo
  (
    SELECT r.name 
    FROM auth.users u
    JOIN auth_roles r ON u.raw_user_meta_data->>'role_id' = r.id::text
    WHERE u.id = auth.uid()
  ) IN ('admin', 'administrador_operativo')
  OR
  -- Ejecutivos ven solo prospectos de su coordinación
  prospecto_id IN (
    SELECT p.id 
    FROM prospectos p
    WHERE p.coordinacion_id IN (
      SELECT coordinacion_id 
      FROM auth_user_coordinaciones 
      WHERE user_id = auth.uid()
      UNION
      SELECT (raw_user_meta_data->>'coordinacion_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  )
);

-- Paso 3: Crear política para coordinadores (ven todas las conversaciones de sus coordinaciones)
CREATE POLICY "Coordinadores ven conversaciones de sus coordinaciones"
ON conversaciones_whatsapp
FOR SELECT
TO authenticated
USING (
  -- Admin y Administrador Operativo ven todo
  (
    SELECT r.name 
    FROM auth.users u
    JOIN auth_roles r ON u.raw_user_meta_data->>'role_id' = r.id::text
    WHERE u.id = auth.uid()
  ) IN ('admin', 'administrador_operativo')
  OR
  -- Coordinadores ven todas las conversaciones de sus coordinaciones
  (
    SELECT r.name 
    FROM auth.users u
    JOIN auth_roles r ON u.raw_user_meta_data->>'role_id' = r.id::text
    WHERE u.id = auth.uid()
  ) = 'coordinador'
  AND
  prospecto_id IN (
    SELECT p.id 
    FROM prospectos p
    WHERE p.coordinacion_id IN (
      SELECT coordinacion_id 
      FROM auth_user_coordinaciones 
      WHERE user_id = auth.uid()
    )
  )
);

-- Paso 4: Permitir INSERT/UPDATE/DELETE solo a authenticated (sin restricciones adicionales por ahora)
CREATE POLICY "Authenticated puede modificar conversaciones"
ON conversaciones_whatsapp
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

SELECT '✅ RLS habilitado y políticas creadas' as resultado;
*/

-- ============================================
-- VERIFICACIÓN FINAL (ejecutar después de aplicar políticas)
-- ============================================

-- Verificar que Mayra NO ve conversaciones de BOOM
-- Ejecutar COMO MAYRA (usando JWT de su sesión)
/*
SELECT 
  '=== CONVERSACIONES VISIBLES PARA MAYRA ===' as seccion,
  cw.id,
  cw.prospecto_id,
  p.nombre as prospecto_nombre,
  c.codigo as coordinacion_codigo,
  p.ejecutivo_id,
  u.email as ejecutivo_email
FROM conversaciones_whatsapp cw
JOIN prospectos p ON cw.prospecto_id = p.id
JOIN coordinaciones c ON p.coordinacion_id = c.id
LEFT JOIN auth.users u ON p.ejecutivo_id = u.id
WHERE auth.uid() = 'f09d601d-5950-4093-857e-a9b6a7efeb73' -- ID de Mayra
LIMIT 20;
-- Esperado: Solo conversaciones de VEN, NINGUNA de BOOM
*/
