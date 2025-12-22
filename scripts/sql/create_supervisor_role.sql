-- ============================================
-- SCRIPT: CREAR ROL SUPERVISOR
-- ============================================
-- 
-- Crea el rol "Supervisor" con permisos similares a Coordinador
-- y capacidad de asignar coordinaciones.
-- 
-- Ejecutar en: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- Fecha: Diciembre 2024
-- ============================================

-- 1. Insertar el nuevo rol en auth_roles
INSERT INTO auth_roles (
  name, 
  display_name, 
  description, 
  is_active, 
  created_at
) VALUES (
  'supervisor',
  'Supervisor',
  'Supervisor de equipo con permisos similares a coordinador. Puede tener múltiples coordinaciones asignadas.',
  true,
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_active = true;

-- 2. Copiar permisos de coordinador a supervisor
-- La tabla auth_role_permissions usa permission_id (UUID), no permission_name
DO $$
DECLARE
  coordinator_role_id UUID;
  supervisor_role_id UUID;
BEGIN
  -- Obtener IDs de roles
  SELECT id INTO coordinator_role_id FROM auth_roles WHERE name = 'coordinador';
  SELECT id INTO supervisor_role_id FROM auth_roles WHERE name = 'supervisor';
  
  -- Solo proceder si ambos roles existen
  IF coordinator_role_id IS NOT NULL AND supervisor_role_id IS NOT NULL THEN
    -- Copiar permisos del coordinador al supervisor
    INSERT INTO auth_role_permissions (role_id, permission_id, created_at)
    SELECT 
      supervisor_role_id,
      permission_id,
      NOW()
    FROM auth_role_permissions
    WHERE role_id = coordinator_role_id
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Permisos copiados de coordinador a supervisor';
  ELSE
    RAISE NOTICE 'No se encontraron los roles necesarios. Coordinator: %, Supervisor: %', coordinator_role_id, supervisor_role_id;
  END IF;
END $$;

-- 3. Crear grupo de permisos para Supervisor (si existe la tabla permission_groups)
DO $$
BEGIN
  -- Verificar si la tabla permission_groups existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_groups') THEN
    INSERT INTO permission_groups (
      name,
      display_name,
      description,
      color,
      icon,
      base_role,
      priority,
      is_system,
      is_active
    ) VALUES (
      'supervisor',
      'Supervisor',
      'Grupo de permisos para supervisores de equipo',
      'from-cyan-500 to-teal-600',
      'UserCheck',
      'supervisor',
      70,
      true,
      true
    )
    ON CONFLICT (name) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
      color = EXCLUDED.color,
      is_active = true;
    
    RAISE NOTICE 'Grupo de permisos supervisor creado/actualizado';
  ELSE
    RAISE NOTICE 'La tabla permission_groups no existe, saltando creación de grupo';
  END IF;
END $$;

-- 4. Copiar permisos de grupo del coordinador al supervisor (si existen las tablas)
DO $$
DECLARE
  coordinator_group_id UUID;
  supervisor_group_id UUID;
BEGIN
  -- Verificar si las tablas existen
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_groups') 
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_permissions') THEN
    
    -- Obtener IDs de grupos
    SELECT id INTO coordinator_group_id FROM permission_groups WHERE name = 'coordinador';
    SELECT id INTO supervisor_group_id FROM permission_groups WHERE name = 'supervisor';
    
    -- Solo proceder si ambos grupos existen
    IF coordinator_group_id IS NOT NULL AND supervisor_group_id IS NOT NULL THEN
      -- Copiar permisos del grupo coordinador al grupo supervisor
      INSERT INTO group_permissions (group_id, module, action, is_granted, scope_restriction, created_at)
      SELECT 
        supervisor_group_id,
        module,
        action,
        is_granted,
        scope_restriction,
        NOW()
      FROM group_permissions
      WHERE group_id = coordinator_group_id
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'Permisos de grupo copiados de coordinador a supervisor';
    ELSE
      RAISE NOTICE 'No se encontraron los grupos necesarios. Coordinator: %, Supervisor: %', coordinator_group_id, supervisor_group_id;
    END IF;
  ELSE
    RAISE NOTICE 'Las tablas de grupos no existen, saltando copia de permisos de grupo';
  END IF;
END $$;

-- 5. Verificar creación del rol
SELECT 
  r.id,
  r.name,
  r.display_name,
  r.description,
  r.is_active,
  r.created_at
FROM auth_roles r
WHERE r.name IN ('coordinador', 'supervisor')
ORDER BY r.name;

-- 6. Verificar permisos copiados
SELECT 
  ar.name as role_name,
  COUNT(arp.permission_id) as permissions_count
FROM auth_roles ar
LEFT JOIN auth_role_permissions arp ON ar.id = arp.role_id
WHERE ar.name IN ('coordinador', 'supervisor')
GROUP BY ar.name
ORDER BY ar.name;

-- ============================================
-- NOTAS:
-- ============================================
-- 
-- El rol Supervisor:
-- - Tiene los mismos permisos que Coordinador
-- - Puede tener múltiples coordinaciones asignadas (igual que coordinador)
-- - Nivel de jerarquía: 3 (igual que coordinador)
-- 
-- El frontend ya está configurado para:
-- - Mostrar el rol Supervisor en la lista de roles
-- - Permitir asignar múltiples coordinaciones
-- - Usar el color cyan/teal para distinguirlo
-- ============================================
