-- ============================================
-- ACTUALIZAR EJECUTIVOS A NO OPERATIVOS
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- Propósito: Cambiar a no operativo a todos los ejecutivos excepto los de coordinación CALIDAD
-- ============================================

-- Verificar que el campo is_operativo existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auth_users' AND column_name = 'is_operativo'
  ) THEN
    ALTER TABLE auth_users 
    ADD COLUMN is_operativo BOOLEAN DEFAULT true;
    
    COMMENT ON COLUMN auth_users.is_operativo IS 'Estado lógico operativo/no operativo. No limita acceso ni permisos, solo es un estado lógico. Por defecto true.';
    
    RAISE NOTICE '✅ Columna is_operativo creada en auth_users';
  END IF;
END $$;

-- Mostrar usuarios que serán actualizados (antes del cambio)
SELECT 
  u.id,
  u.email,
  u.full_name,
  r.name as rol,
  c.codigo as coordinacion_codigo,
  c.nombre as coordinacion_nombre,
  u.is_operativo as estado_actual
FROM auth_users u
JOIN auth_roles r ON u.role_id = r.id
LEFT JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE r.name = 'ejecutivo'
  AND (c.codigo IS NULL OR c.codigo != 'CALIDAD')
ORDER BY c.codigo, u.email;

-- Actualizar ejecutivos a no operativo (excepto coordinación CALIDAD)
UPDATE auth_users u
SET 
  is_operativo = false,
  updated_at = NOW()
WHERE u.role_id IN (
  SELECT r.id 
  FROM auth_roles r 
  WHERE r.name = 'ejecutivo'
)
AND (
  u.coordinacion_id IS NULL 
  OR u.coordinacion_id NOT IN (
    SELECT c.id 
    FROM coordinaciones c 
    WHERE c.codigo = 'CALIDAD'
  )
);

-- Mostrar resumen de cambios
SELECT 
  COUNT(*) FILTER (WHERE u.is_operativo = false) as ejecutivos_no_operativos,
  COUNT(*) FILTER (WHERE u.is_operativo = true) as ejecutivos_operativos,
  COUNT(*) FILTER (WHERE c.codigo = 'CALIDAD' AND u.is_operativo = true) as ejecutivos_calidad_operativos,
  COUNT(*) as total_ejecutivos
FROM auth_users u
JOIN auth_roles r ON u.role_id = r.id
LEFT JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE r.name = 'ejecutivo';

-- Verificar usuarios de CALIDAD que NO fueron afectados
SELECT 
  u.id,
  u.email,
  u.full_name,
  c.codigo as coordinacion_codigo,
  u.is_operativo as estado_operativo
FROM auth_users u
JOIN auth_roles r ON u.role_id = r.id
JOIN coordinaciones c ON u.coordinacion_id = c.id
WHERE r.name = 'ejecutivo'
  AND c.codigo = 'CALIDAD'
ORDER BY u.email;
