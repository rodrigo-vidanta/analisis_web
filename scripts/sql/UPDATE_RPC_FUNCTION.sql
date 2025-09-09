-- ============================================
-- ACTUALIZAR FUNCIÓN RPC EXISTENTE PARA INCLUIR LIVE MONITOR
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. ACTUALIZAR LA FUNCIÓN get_evaluator_analysis_config PARA INCLUIR LIVE MONITOR
CREATE OR REPLACE FUNCTION get_evaluator_analysis_config(p_target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Por ahora, usar lógica simple basada en email hasta que se implemente el sistema completo
  SELECT json_build_object(
    'has_natalia_access', CASE 
      WHEN u.email = 'rodrigomora@grupovidanta.com' THEN FALSE
      ELSE TRUE  -- Otros evaluadores tienen acceso a Natalia por defecto
    END,
    'has_pqnc_access', TRUE,  -- Todos los evaluadores tienen acceso a PQNC
    'has_live_monitor_access', CASE 
      WHEN u.email = 'rodrigomora@grupovidanta.com' THEN TRUE
      ELSE FALSE  -- Solo Rodrigo tiene Live Monitor por ahora
    END
  ) INTO result
  FROM auth_users u
  WHERE u.id = p_target_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CREAR/ACTUALIZAR LA FUNCIÓN configure_evaluator_analysis_permissions
CREATE OR REPLACE FUNCTION configure_evaluator_analysis_permissions(
  p_target_user_id UUID,
  p_natalia_access BOOLEAN DEFAULT FALSE,
  p_pqnc_access BOOLEAN DEFAULT FALSE,
  p_live_monitor_access BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
BEGIN
  -- Por ahora, solo logear la configuración
  -- En el futuro, aquí se guardaría en una tabla específica
  
  RAISE NOTICE 'Configurando permisos para usuario %: Natalia=%, PQNC=%, LiveMonitor=%', 
    p_target_user_id, p_natalia_access, p_pqnc_access, p_live_monitor_access;
  
  RETURN json_build_object(
    'success', TRUE,
    'user_id', p_target_user_id,
    'natalia_access', p_natalia_access,
    'pqnc_access', p_pqnc_access,
    'live_monitor_access', p_live_monitor_access,
    'message', 'Configuración temporal aplicada'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROBAR LAS FUNCIONES
-- Probar get_evaluator_analysis_config con Rodrigo
SELECT get_evaluator_analysis_config(
  (SELECT id FROM auth_users WHERE email = 'rodrigomora@grupovidanta.com')
);

-- Probar configure_evaluator_analysis_permissions
SELECT configure_evaluator_analysis_permissions(
  (SELECT id FROM auth_users WHERE email = 'rodrigomora@grupovidanta.com'),
  FALSE,  -- Sin Natalia
  TRUE,   -- Con PQNC  
  TRUE    -- Con Live Monitor
);
