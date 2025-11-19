-- ============================================
-- CREAR COORDINACIÓN CALIDAD Y COORDINADORES
-- Base de datos: zbylezfyagwrxoecioup.supabase.co (SystemUI)
-- Propósito: Crear coordinación CALIDAD, 4 coordinadores y reasignar prospectos
-- ============================================

-- 1. Crear coordinación CALIDAD si no existe
INSERT INTO coordinaciones (codigo, nombre, descripcion, is_active)
VALUES ('CALIDAD', 'CALIDAD', 'Coordinación de Calidad', true)
ON CONFLICT (codigo) DO UPDATE
SET 
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Obtener el ID de la coordinación CALIDAD
DO $$
DECLARE
  calidad_coordinacion_id UUID;
  coordinador_role_id UUID;
  user_id_var UUID;
BEGIN
  -- Obtener ID de coordinación CALIDAD
  SELECT id INTO calidad_coordinacion_id
  FROM coordinaciones
  WHERE codigo = 'CALIDAD'
  LIMIT 1;

  -- Obtener ID del rol coordinador
  SELECT id INTO coordinador_role_id
  FROM auth_roles
  WHERE name = 'coordinador'
  LIMIT 1;

  IF coordinador_role_id IS NULL THEN
    RAISE EXCEPTION 'Rol coordinador no encontrado';
  END IF;

  -- ============================================
  -- 2. CREAR USUARIOS COORDINADORES
  -- ============================================

  -- Usuario 1: ANGELICA GUZMAN VELASCO
  -- Verificar si ya existe
  SELECT id INTO user_id_var
  FROM auth_users
  WHERE email = 'angelicaguzman@vidavacations.com'
  LIMIT 1;

  IF user_id_var IS NULL THEN
    -- Crear usuario usando función RPC
    SELECT user_id INTO user_id_var
    FROM create_user_with_role(
      'angelicaguzman@vidavacations.com',
      'P1ay4.Vta',
      'Angélica',
      'Guzmán Velasco',
      coordinador_role_id,
      '035149',
      NULL,
      NULL,
      true
    );

    -- Actualizar flags del coordinador
    UPDATE auth_users
    SET 
      is_coordinator = true,
      is_ejecutivo = false,
      id_colaborador = '035149',
      id_dynamics = '035149'
    WHERE id = user_id_var;

    -- Asignar a coordinación CALIDAD
    INSERT INTO coordinador_coordinaciones (coordinador_id, coordinacion_id)
    VALUES (user_id_var, calidad_coordinacion_id)
    ON CONFLICT (coordinador_id, coordinacion_id) DO NOTHING;

    RAISE NOTICE 'Usuario creado: ANGELICA GUZMAN VELASCO (ID: %)', user_id_var;
  ELSE
    -- Si ya existe, actualizar y asignar coordinación
    UPDATE auth_users
    SET 
      is_coordinator = true,
      is_ejecutivo = false,
      id_colaborador = '035149',
      id_dynamics = '035149'
    WHERE id = user_id_var;

    INSERT INTO coordinador_coordinaciones (coordinador_id, coordinacion_id)
    VALUES (user_id_var, calidad_coordinacion_id)
    ON CONFLICT (coordinador_id, coordinacion_id) DO NOTHING;

    RAISE NOTICE 'Usuario actualizado: ANGELICA GUZMAN VELASCO (ID: %)', user_id_var;
  END IF;

  -- Usuario 2: MARÍA FERNANDA MONDRAGÓN LÓPEZ
  SELECT id INTO user_id_var
  FROM auth_users
  WHERE email = 'fernandamondragon@vidavacations.com'
  LIMIT 1;

  IF user_id_var IS NULL THEN
    SELECT user_id INTO user_id_var
    FROM create_user_with_role(
      'fernandamondragon@vidavacations.com',
      'VidaVacations.01',
      'María Fernanda',
      'Mondragón López',
      coordinador_role_id,
      '027564',
      NULL,
      NULL,
      true
    );

    UPDATE auth_users
    SET 
      is_coordinator = true,
      is_ejecutivo = false,
      id_colaborador = '027564',
      id_dynamics = '027564'
    WHERE id = user_id_var;

    INSERT INTO coordinador_coordinaciones (coordinador_id, coordinacion_id)
    VALUES (user_id_var, calidad_coordinacion_id)
    ON CONFLICT (coordinador_id, coordinacion_id) DO NOTHING;

    RAISE NOTICE 'Usuario creado: MARÍA FERNANDA MONDRAGÓN LÓPEZ (ID: %)', user_id_var;
  ELSE
    UPDATE auth_users
    SET 
      is_coordinator = true,
      is_ejecutivo = false,
      id_colaborador = '027564',
      id_dynamics = '027564'
    WHERE id = user_id_var;

    INSERT INTO coordinador_coordinaciones (coordinador_id, coordinacion_id)
    VALUES (user_id_var, calidad_coordinacion_id)
    ON CONFLICT (coordinador_id, coordinacion_id) DO NOTHING;

    RAISE NOTICE 'Usuario actualizado: MARÍA FERNANDA MONDRAGÓN LÓPEZ (ID: %)', user_id_var;
  END IF;

  -- Usuario 3: VANESSA VALENTINA PEREZ MORENO
  SELECT id INTO user_id_var
  FROM auth_users
  WHERE email = 'Vanessaperez@vidavacations.com'
  LIMIT 1;

  IF user_id_var IS NULL THEN
    SELECT user_id INTO user_id_var
    FROM create_user_with_role(
      'Vanessaperez@vidavacations.com',
      'Santurron9081*',
      'Vanessa Valentina',
      'Pérez Moreno',
      coordinador_role_id,
      '034646',
      NULL,
      NULL,
      true
    );

    UPDATE auth_users
    SET 
      is_coordinator = true,
      is_ejecutivo = false,
      id_colaborador = '034646',
      id_dynamics = '034646'
    WHERE id = user_id_var;

    INSERT INTO coordinador_coordinaciones (coordinador_id, coordinacion_id)
    VALUES (user_id_var, calidad_coordinacion_id)
    ON CONFLICT (coordinador_id, coordinacion_id) DO NOTHING;

    RAISE NOTICE 'Usuario creado: VANESSA VALENTINA PEREZ MORENO (ID: %)', user_id_var;
  ELSE
    UPDATE auth_users
    SET 
      is_coordinator = true,
      is_ejecutivo = false,
      id_colaborador = '034646',
      id_dynamics = '034646'
    WHERE id = user_id_var;

    INSERT INTO coordinador_coordinaciones (coordinador_id, coordinacion_id)
    VALUES (user_id_var, calidad_coordinacion_id)
    ON CONFLICT (coordinador_id, coordinacion_id) DO NOTHING;

    RAISE NOTICE 'Usuario actualizado: VANESSA VALENTINA PEREZ MORENO (ID: %)', user_id_var;
  END IF;

  -- Usuario 4: ELIZABETH HERNANDEZ RAMIREZ
  SELECT id INTO user_id_var
  FROM auth_users
  WHERE email = 'Elizabethhernandez@vidavacations.com'
  LIMIT 1;

  IF user_id_var IS NULL THEN
    SELECT user_id INTO user_id_var
    FROM create_user_with_role(
      'Elizabethhernandez@vidavacations.com',
      'Nuevovallarta2409',
      'Elizabeth',
      'Hernández Ramírez',
      coordinador_role_id,
      '034458',
      NULL,
      NULL,
      true
    );

    UPDATE auth_users
    SET 
      is_coordinator = true,
      is_ejecutivo = false,
      id_colaborador = '034458',
      id_dynamics = '034458'
    WHERE id = user_id_var;

    INSERT INTO coordinador_coordinaciones (coordinador_id, coordinacion_id)
    VALUES (user_id_var, calidad_coordinacion_id)
    ON CONFLICT (coordinador_id, coordinacion_id) DO NOTHING;

    RAISE NOTICE 'Usuario creado: ELIZABETH HERNANDEZ RAMIREZ (ID: %)', user_id_var;
  ELSE
    UPDATE auth_users
    SET 
      is_coordinator = true,
      is_ejecutivo = false,
      id_colaborador = '034458',
      id_dynamics = '034458'
    WHERE id = user_id_var;

    INSERT INTO coordinador_coordinaciones (coordinador_id, coordinacion_id)
    VALUES (user_id_var, calidad_coordinacion_id)
    ON CONFLICT (coordinador_id, coordinacion_id) DO NOTHING;

    RAISE NOTICE 'Usuario actualizado: ELIZABETH HERNANDEZ RAMIREZ (ID: %)', user_id_var;
  END IF;

  -- ============================================
  -- 3. REASIGNAR TODOS LOS PROSPECTOS A CALIDAD
  -- ============================================

  UPDATE prospectos
  SET coordinacion_id = calidad_coordinacion_id
  WHERE coordinacion_id IS NULL OR coordinacion_id != calidad_coordinacion_id;

  RAISE NOTICE 'Prospectos reasignados a coordinación CALIDAD';

END $$;

-- Verificar resultados
SELECT 
  u.email,
  u.first_name || ' ' || u.last_name as nombre_completo,
  u.id_colaborador,
  c.codigo as coordinacion_codigo,
  c.nombre as coordinacion_nombre
FROM auth_users u
JOIN coordinador_coordinaciones cc ON u.id = cc.coordinador_id
JOIN coordinaciones c ON cc.coordinacion_id = c.id
WHERE c.codigo = 'CALIDAD'
ORDER BY u.email;

-- Contar prospectos asignados a CALIDAD
SELECT 
  COUNT(*) as total_prospectos_calidad,
  c.codigo as coordinacion_codigo
FROM prospectos p
JOIN coordinaciones c ON p.coordinacion_id = c.id
WHERE c.codigo = 'CALIDAD'
GROUP BY c.codigo;

