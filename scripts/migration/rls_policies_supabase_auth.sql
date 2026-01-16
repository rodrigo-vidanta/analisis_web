-- ============================================
-- POLITICAS RLS PARA SUPABASE AUTH NATIVO
-- ============================================
-- 
-- Fecha: 16 Enero 2026
-- Proyecto: PQNC QA AI Platform
-- Version: 1.0.0
--
-- INSTRUCCIONES:
-- 1. Ejecutar DESPUES de migrate_to_supabase_auth.sql
-- 2. Ejecutar en Supabase SQL Editor (glsmifhkoaifvaegsozd)
-- 3. Probar cada politica antes de continuar
--
-- ============================================

-- ============================================
-- SECCION 1: FUNCIONES HELPER PARA RLS
-- ============================================

-- 1.1 Verificar si el usuario actual tiene un rol especifico
CREATE OR REPLACE FUNCTION public.current_user_has_role(p_role_names TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  v_role_name := public.get_current_user_role();
  RETURN v_role_name = ANY(p_role_names);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1.2 Obtener IDs de coordinaciones del usuario (para supervisores/coordinadores)
CREATE OR REPLACE FUNCTION public.get_current_user_coordinaciones()
RETURNS UUID[] AS $$
DECLARE
  v_user_id UUID;
  v_coordinacion_id UUID;
  v_coordinaciones UUID[];
BEGIN
  v_user_id := auth.uid();
  v_coordinacion_id := public.get_current_user_coordinacion();
  
  -- Obtener coordinaciones asignadas desde auth_user_coordinaciones
  SELECT ARRAY_AGG(DISTINCT coordinacion_id)
  INTO v_coordinaciones
  FROM public.auth_user_coordinaciones
  WHERE user_id = v_user_id;
  
  -- Agregar coordinacion_id del perfil si no esta en la lista
  IF v_coordinacion_id IS NOT NULL THEN
    IF v_coordinaciones IS NULL THEN
      v_coordinaciones := ARRAY[v_coordinacion_id];
    ELSIF NOT v_coordinacion_id = ANY(v_coordinaciones) THEN
      v_coordinaciones := v_coordinaciones || v_coordinacion_id;
    END IF;
  END IF;
  
  RETURN COALESCE(v_coordinaciones, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grants
GRANT EXECUTE ON FUNCTION public.current_user_has_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_coordinaciones() TO authenticated;

-- ============================================
-- SECCION 2: POLITICAS PARA PROSPECTOS
-- ============================================

-- 2.1 Habilitar RLS
ALTER TABLE public.prospectos ENABLE ROW LEVEL SECURITY;

-- 2.2 Eliminar politicas existentes si hay
DROP POLICY IF EXISTS "prospectos_select_by_role" ON public.prospectos;
DROP POLICY IF EXISTS "prospectos_insert_by_role" ON public.prospectos;
DROP POLICY IF EXISTS "prospectos_update_by_role" ON public.prospectos;
DROP POLICY IF EXISTS "prospectos_delete_by_role" ON public.prospectos;

-- 2.3 SELECT: Usuarios ven prospectos segun su rol
CREATE POLICY "prospectos_select_by_role" ON public.prospectos
FOR SELECT USING (
  -- Admin y administrador_operativo ven todo
  public.current_user_has_role(ARRAY['admin', 'administrador_operativo', 'developer'])
  OR
  -- Ejecutivo ve solo sus prospectos asignados
  (
    public.current_user_has_role(ARRAY['ejecutivo'])
    AND ejecutivo_id = auth.uid()
  )
  OR
  -- Coordinador ve prospectos de sus coordinaciones
  (
    public.current_user_has_role(ARRAY['coordinador'])
    AND coordinacion_id = ANY(public.get_current_user_coordinaciones())
  )
  OR
  -- Supervisor ve prospectos de sus coordinaciones
  (
    public.current_user_has_role(ARRAY['supervisor'])
    AND coordinacion_id = ANY(public.get_current_user_coordinaciones())
  )
);

-- 2.4 INSERT: Solo admin y coordinadores pueden crear
CREATE POLICY "prospectos_insert_by_role" ON public.prospectos
FOR INSERT WITH CHECK (
  public.current_user_has_role(ARRAY['admin', 'administrador_operativo', 'coordinador'])
);

-- 2.5 UPDATE: Segun rol
CREATE POLICY "prospectos_update_by_role" ON public.prospectos
FOR UPDATE USING (
  -- Admin puede actualizar todo
  public.current_user_has_role(ARRAY['admin', 'administrador_operativo'])
  OR
  -- Ejecutivo puede actualizar sus prospectos
  (
    public.current_user_has_role(ARRAY['ejecutivo'])
    AND ejecutivo_id = auth.uid()
  )
  OR
  -- Coordinador puede actualizar prospectos de su coordinacion
  (
    public.current_user_has_role(ARRAY['coordinador'])
    AND coordinacion_id = ANY(public.get_current_user_coordinaciones())
  )
);

-- 2.6 DELETE: Solo admin
CREATE POLICY "prospectos_delete_by_role" ON public.prospectos
FOR DELETE USING (
  public.current_user_has_role(ARRAY['admin'])
);

-- ============================================
-- SECCION 3: POLITICAS PARA LLAMADAS_VENTAS
-- ============================================

-- 3.1 Habilitar RLS
ALTER TABLE public.llamadas_ventas ENABLE ROW LEVEL SECURITY;

-- 3.2 Eliminar politicas existentes
DROP POLICY IF EXISTS "llamadas_select_by_role" ON public.llamadas_ventas;
DROP POLICY IF EXISTS "llamadas_insert_by_role" ON public.llamadas_ventas;
DROP POLICY IF EXISTS "llamadas_update_by_role" ON public.llamadas_ventas;

-- 3.3 SELECT: Basado en acceso al prospecto
CREATE POLICY "llamadas_select_by_role" ON public.llamadas_ventas
FOR SELECT USING (
  -- Admin ve todo
  public.current_user_has_role(ARRAY['admin', 'administrador_operativo', 'developer'])
  OR
  -- Otros ven llamadas de prospectos a los que tienen acceso
  EXISTS (
    SELECT 1 FROM public.prospectos p 
    WHERE p.id = llamadas_ventas.prospecto_id
    AND (
      -- Ejecutivo ve sus prospectos
      (public.current_user_has_role(ARRAY['ejecutivo']) AND p.ejecutivo_id = auth.uid())
      OR
      -- Coordinador/Supervisor ven su coordinacion
      (public.current_user_has_role(ARRAY['coordinador', 'supervisor']) 
       AND p.coordinacion_id = ANY(public.get_current_user_coordinaciones()))
    )
  )
);

-- 3.4 INSERT: Sistema puede insertar (via service_role)
CREATE POLICY "llamadas_insert_by_role" ON public.llamadas_ventas
FOR INSERT WITH CHECK (
  public.current_user_has_role(ARRAY['admin', 'developer'])
  OR
  -- Permitir insercion si tiene acceso al prospecto
  EXISTS (
    SELECT 1 FROM public.prospectos p 
    WHERE p.id = llamadas_ventas.prospecto_id
  )
);

-- 3.5 UPDATE: Basado en acceso al prospecto
CREATE POLICY "llamadas_update_by_role" ON public.llamadas_ventas
FOR UPDATE USING (
  public.current_user_has_role(ARRAY['admin', 'developer'])
  OR
  EXISTS (
    SELECT 1 FROM public.prospectos p 
    WHERE p.id = llamadas_ventas.prospecto_id
    AND (
      (public.current_user_has_role(ARRAY['ejecutivo']) AND p.ejecutivo_id = auth.uid())
      OR
      (public.current_user_has_role(ARRAY['coordinador']) 
       AND p.coordinacion_id = ANY(public.get_current_user_coordinaciones()))
    )
  )
);

-- ============================================
-- SECCION 4: POLITICAS PARA CONVERSACIONES_WHATSAPP
-- ============================================

-- 4.1 Habilitar RLS
ALTER TABLE public.conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;

-- 4.2 Eliminar politicas existentes
DROP POLICY IF EXISTS "conversaciones_select_by_role" ON public.conversaciones_whatsapp;
DROP POLICY IF EXISTS "conversaciones_update_by_role" ON public.conversaciones_whatsapp;

-- 4.3 SELECT: Basado en acceso al prospecto
CREATE POLICY "conversaciones_select_by_role" ON public.conversaciones_whatsapp
FOR SELECT USING (
  -- Admin ve todo
  public.current_user_has_role(ARRAY['admin', 'administrador_operativo', 'developer'])
  OR
  -- Otros ven conversaciones de prospectos a los que tienen acceso
  EXISTS (
    SELECT 1 FROM public.prospectos p 
    WHERE p.id = conversaciones_whatsapp.prospecto_id
    AND (
      (public.current_user_has_role(ARRAY['ejecutivo']) AND p.ejecutivo_id = auth.uid())
      OR
      (public.current_user_has_role(ARRAY['coordinador', 'supervisor']) 
       AND p.coordinacion_id = ANY(public.get_current_user_coordinaciones()))
    )
  )
);

-- 4.4 UPDATE: Basado en acceso al prospecto
CREATE POLICY "conversaciones_update_by_role" ON public.conversaciones_whatsapp
FOR UPDATE USING (
  public.current_user_has_role(ARRAY['admin', 'developer'])
  OR
  EXISTS (
    SELECT 1 FROM public.prospectos p 
    WHERE p.id = conversaciones_whatsapp.prospecto_id
    AND (
      (public.current_user_has_role(ARRAY['ejecutivo']) AND p.ejecutivo_id = auth.uid())
      OR
      (public.current_user_has_role(ARRAY['coordinador']) 
       AND p.coordinacion_id = ANY(public.get_current_user_coordinaciones()))
    )
  )
);

-- ============================================
-- SECCION 5: POLITICAS PARA MENSAJES_WHATSAPP
-- ============================================

-- 5.1 Habilitar RLS
ALTER TABLE public.mensajes_whatsapp ENABLE ROW LEVEL SECURITY;

-- 5.2 Eliminar politicas existentes
DROP POLICY IF EXISTS "mensajes_select_by_role" ON public.mensajes_whatsapp;

-- 5.3 SELECT: Basado en acceso a la conversacion
CREATE POLICY "mensajes_select_by_role" ON public.mensajes_whatsapp
FOR SELECT USING (
  public.current_user_has_role(ARRAY['admin', 'administrador_operativo', 'developer'])
  OR
  EXISTS (
    SELECT 1 FROM public.conversaciones_whatsapp c
    JOIN public.prospectos p ON p.id = c.prospecto_id
    WHERE c.id = mensajes_whatsapp.conversacion_id
    AND (
      (public.current_user_has_role(ARRAY['ejecutivo']) AND p.ejecutivo_id = auth.uid())
      OR
      (public.current_user_has_role(ARRAY['coordinador', 'supervisor']) 
       AND p.coordinacion_id = ANY(public.get_current_user_coordinaciones()))
    )
  )
);

-- ============================================
-- SECCION 6: POLITICAS PARA user_profiles_v2
-- ============================================

-- La vista ya tiene acceso automatico via el SELECT de auth.users
-- Solo necesitamos politicas para tablas relacionadas

-- ============================================
-- SECCION 7: POLITICAS PARA auth_user_coordinaciones
-- ============================================

-- 7.1 Habilitar RLS
ALTER TABLE public.auth_user_coordinaciones ENABLE ROW LEVEL SECURITY;

-- 7.2 Eliminar politicas existentes
DROP POLICY IF EXISTS "auth_user_coord_select" ON public.auth_user_coordinaciones;
DROP POLICY IF EXISTS "auth_user_coord_insert" ON public.auth_user_coordinaciones;
DROP POLICY IF EXISTS "auth_user_coord_delete" ON public.auth_user_coordinaciones;

-- 7.3 SELECT: Usuario ve sus propias coordinaciones, admin ve todas
CREATE POLICY "auth_user_coord_select" ON public.auth_user_coordinaciones
FOR SELECT USING (
  public.current_user_has_role(ARRAY['admin', 'administrador_operativo'])
  OR user_id = auth.uid()
);

-- 7.4 INSERT: Solo admin
CREATE POLICY "auth_user_coord_insert" ON public.auth_user_coordinaciones
FOR INSERT WITH CHECK (
  public.current_user_has_role(ARRAY['admin', 'administrador_operativo'])
);

-- 7.5 DELETE: Solo admin
CREATE POLICY "auth_user_coord_delete" ON public.auth_user_coordinaciones
FOR DELETE USING (
  public.current_user_has_role(ARRAY['admin'])
);

-- ============================================
-- SECCION 8: POLITICAS PARA auth_user_permissions
-- ============================================

-- 8.1 Habilitar RLS
ALTER TABLE public.auth_user_permissions ENABLE ROW LEVEL SECURITY;

-- 8.2 Eliminar politicas existentes
DROP POLICY IF EXISTS "auth_user_perm_select" ON public.auth_user_permissions;

-- 8.3 SELECT: Usuario ve sus propios permisos
CREATE POLICY "auth_user_perm_select" ON public.auth_user_permissions
FOR SELECT USING (
  public.current_user_has_role(ARRAY['admin'])
  OR user_id = auth.uid()
);

-- ============================================
-- SECCION 9: POLITICAS PARA user_ui_preferences
-- ============================================

-- 9.1 Habilitar RLS
ALTER TABLE public.user_ui_preferences ENABLE ROW LEVEL SECURITY;

-- 9.2 Eliminar politicas existentes
DROP POLICY IF EXISTS "user_ui_prefs_all" ON public.user_ui_preferences;

-- 9.3 Usuarios manejan sus propias preferencias
CREATE POLICY "user_ui_prefs_all" ON public.user_ui_preferences
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- SECCION 10: POLITICAS PARA auth_sessions (DEPRECADA)
-- ============================================

-- Nota: auth_sessions ya no sera necesaria con Supabase Auth
-- Las sesiones se manejan automaticamente por Supabase

-- ============================================
-- SECCION 11: VERIFICACION DE POLITICAS
-- ============================================

-- Query para verificar politicas creadas:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

-- ============================================
-- ROLLBACK
-- ============================================

-- Para deshabilitar RLS y eliminar politicas:
-- 
-- ALTER TABLE public.prospectos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.llamadas_ventas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.conversaciones_whatsapp DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.mensajes_whatsapp DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.auth_user_coordinaciones DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.auth_user_permissions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_ui_preferences DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "prospectos_select_by_role" ON public.prospectos;
-- DROP POLICY IF EXISTS "prospectos_insert_by_role" ON public.prospectos;
-- DROP POLICY IF EXISTS "prospectos_update_by_role" ON public.prospectos;
-- DROP POLICY IF EXISTS "prospectos_delete_by_role" ON public.prospectos;
-- (etc para todas las tablas)
