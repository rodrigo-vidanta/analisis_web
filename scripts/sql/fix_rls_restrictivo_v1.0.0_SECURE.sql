-- ============================================
-- FASE 3: RLS RESTRICTIVO EN TABLAS CRÍTICAS
-- ============================================
-- Fecha: 2 de Febrero 2026
-- Objetivo: Implementar RLS restrictivo basado en jerarquía de permisos

-- ============================================
-- PASO 1: Función Helper para Validación de Permisos
-- ============================================

CREATE OR REPLACE FUNCTION user_can_see_prospecto(
  prospecto_coordinacion_id UUID, 
  prospecto_ejecutivo_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_user_id uuid;
  v_role_name text;
  v_user_coordinacion_id uuid;
  v_coordinaciones_ids uuid[];
  v_is_admin boolean;
BEGIN
  -- Obtener usuario autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;  -- No autenticado = sin acceso
  END IF;
  
  -- Obtener rol y coordinación del usuario desde user_profiles_v2
  SELECT 
    role_name,
    coordinacion_id,
    role_name IN ('admin', 'administrador_operativo', 'calidad')
  INTO v_role_name, v_user_coordinacion_id, v_is_admin
  FROM public.user_profiles_v2
  WHERE id = v_user_id;
  
  -- Si no tiene rol, denegar acceso
  IF v_role_name IS NULL THEN
    RETURN false;
  END IF;
  
  -- NIVEL 1: Admin/Calidad ve TODO
  IF v_is_admin THEN
    RETURN true;
  END IF;
  
  -- NIVEL 2: Coordinadores/Supervisores ven sus coordinaciones
  IF v_role_name IN ('coordinador', 'supervisor') THEN
    -- Obtener todas las coordinaciones asignadas al usuario
    SELECT ARRAY_AGG(coordinacion_id)
    INTO v_coordinaciones_ids
    FROM public.auth_user_coordinaciones
    WHERE user_id = v_user_id;
    
    -- Verificar si el prospecto pertenece a alguna de sus coordinaciones
    RETURN prospecto_coordinacion_id = ANY(v_coordinaciones_ids);
  END IF;
  
  -- NIVEL 3: Ejecutivos ven solo sus prospectos asignados Y de su coordinación
  IF v_role_name = 'ejecutivo' THEN
    RETURN prospecto_ejecutivo_id = v_user_id
           AND (prospecto_coordinacion_id = v_user_coordinacion_id OR v_user_coordinacion_id IS NULL);
  END IF;
  
  -- NIVEL 4: Otros roles (operativos, etc.) - sin acceso por defecto
  RETURN false;
END;
$$;

COMMENT ON FUNCTION user_can_see_prospecto IS 'RLS Helper: Valida si usuario puede ver prospecto según jerarquía de permisos';

-- ============================================
-- PASO 2: PROSPECTOS - Políticas Restrictivas
-- ============================================

-- Eliminar políticas permisivas
DROP POLICY IF EXISTS "Authenticated can read prospectos" ON public.prospectos;
DROP POLICY IF EXISTS "Authenticated can manage prospectos" ON public.prospectos;

-- LECTURA: Basada en función helper
CREATE POLICY "RLS: prospectos read by permissions"
ON public.prospectos FOR SELECT
TO authenticated
USING (user_can_see_prospecto(coordinacion_id, ejecutivo_id));

-- ESCRITURA: Solo admin, coordinadores, supervisores
CREATE POLICY "RLS: prospectos write by role"
ON public.prospectos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
  )
);

COMMENT ON POLICY "RLS: prospectos read by permissions" ON public.prospectos IS 'Filtra prospectos según jerarquía: Admin ve todo, Coordinador ve sus coords, Ejecutivo ve solo sus asignados';

-- ============================================
-- PASO 3: MENSAJES_WHATSAPP - Heredan permisos de prospecto
-- ============================================

DROP POLICY IF EXISTS "auth_rw_mensajes" ON public.mensajes_whatsapp;

-- LECTURA: Basada en permisos del prospecto relacionado
CREATE POLICY "RLS: mensajes read by prospecto permissions"
ON public.mensajes_whatsapp FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prospectos p
    WHERE p.id = mensajes_whatsapp.prospecto_id
    AND user_can_see_prospecto(p.coordinacion_id, p.ejecutivo_id)
  )
);

-- ESCRITURA: Admin, coordinadores, supervisores, O ejecutivo del prospecto
CREATE POLICY "RLS: mensajes write by role"
ON public.mensajes_whatsapp FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles_v2 u
    JOIN public.prospectos p ON p.id = mensajes_whatsapp.prospecto_id
    WHERE u.id = auth.uid()
    AND (
      u.role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
      OR (u.role_name = 'ejecutivo' AND p.ejecutivo_id = u.id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles_v2 u
    JOIN public.prospectos p ON p.id = mensajes_whatsapp.prospecto_id
    WHERE u.id = auth.uid()
    AND (
      u.role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
      OR (u.role_name = 'ejecutivo' AND p.ejecutivo_id = u.id)
    )
  )
);

-- ============================================
-- PASO 4: CONVERSACIONES_WHATSAPP - Heredan permisos de prospecto
-- ============================================

DROP POLICY IF EXISTS "Authenticated can read whatsapp" ON public.conversaciones_whatsapp;
DROP POLICY IF EXISTS "Authenticated can update whatsapp" ON public.conversaciones_whatsapp;

CREATE POLICY "RLS: conversaciones read by prospecto permissions"
ON public.conversaciones_whatsapp FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prospectos p
    WHERE p.id = conversaciones_whatsapp.prospecto_id
    AND user_can_see_prospecto(p.coordinacion_id, p.ejecutivo_id)
  )
);

CREATE POLICY "RLS: conversaciones write by role"
ON public.conversaciones_whatsapp FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles_v2 u
    JOIN public.prospectos p ON p.id = conversaciones_whatsapp.prospecto_id
    WHERE u.id = auth.uid()
    AND (
      u.role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
      OR (u.role_name = 'ejecutivo' AND p.ejecutivo_id = u.id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles_v2 u
    JOIN public.prospectos p ON p.id = conversaciones_whatsapp.prospecto_id
    WHERE u.id = auth.uid()
    AND (
      u.role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
      OR (u.role_name = 'ejecutivo' AND p.ejecutivo_id = u.id)
    )
  )
);

-- ============================================
-- PASO 5: LLAMADAS_VENTAS - Heredan permisos de prospecto
-- ============================================

DROP POLICY IF EXISTS "Authenticated can read llamadas" ON public.llamadas_ventas;
DROP POLICY IF EXISTS "Authenticated can manage llamadas" ON public.llamadas_ventas;

CREATE POLICY "RLS: llamadas read by prospecto permissions"
ON public.llamadas_ventas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prospectos p
    WHERE p.id = llamadas_ventas.prospecto
    AND user_can_see_prospecto(p.coordinacion_id, p.ejecutivo_id)
  )
);

CREATE POLICY "RLS: llamadas write by role"
ON public.llamadas_ventas FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles_v2 u
    JOIN public.prospectos p ON p.id = llamadas_ventas.prospecto
    WHERE u.id = auth.uid()
    AND (
      u.role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
      OR (u.role_name = 'ejecutivo' AND p.ejecutivo_id = u.id)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles_v2 u
    JOIN public.prospectos p ON p.id = llamadas_ventas.prospecto
    WHERE u.id = auth.uid()
    AND (
      u.role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
      OR (u.role_name = 'ejecutivo' AND p.ejecutivo_id = u.id)
    )
  )
);

-- ============================================
-- PASO 6: PROSPECT_ASSIGNMENTS - Solo lectura basada en prospecto
-- ============================================

DROP POLICY IF EXISTS "Authenticated can read prospect_assignments" ON public.prospect_assignments;
DROP POLICY IF EXISTS "Authenticated can manage prospect_assignments" ON public.prospect_assignments;

CREATE POLICY "RLS: assignments read by prospecto permissions"
ON public.prospect_assignments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prospectos p
    WHERE p.id = prospect_assignments.prospect_id
    AND user_can_see_prospecto(p.coordinacion_id, p.ejecutivo_id)
  )
);

-- Escritura: Solo admin y coordinadores (asignaciones son sensibles)
CREATE POLICY "RLS: assignments write by admin"
ON public.prospect_assignments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles_v2
    WHERE id = auth.uid()
    AND role_name IN ('admin', 'administrador_operativo', 'coordinador', 'supervisor')
  )
);

-- ============================================
-- PASO 7: Verificación
-- ============================================

-- Listar todas las políticas nuevas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('prospectos', 'mensajes_whatsapp', 'conversaciones_whatsapp', 'llamadas_ventas', 'prospect_assignments')
AND policyname LIKE 'RLS:%'
ORDER BY tablename, cmd, policyname;

-- Resultado esperado: 10 políticas con prefijo "RLS:"
-- prospectos: 2 (read, write)
-- mensajes_whatsapp: 2 (read, write)
-- conversaciones_whatsapp: 2 (read, write)
-- llamadas_ventas: 2 (read, write)
-- prospect_assignments: 2 (read, write)
