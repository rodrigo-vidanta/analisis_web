-- ============================================
-- FUNCIÓN PARA RESETEAR WARNINGS DE UN USUARIO
-- Base de datos: system_ui (zbylezfyagwrxoecioup.supabase.co)
-- ============================================

-- Función RPC para resetear contador de warnings (desbloquear usuario)
CREATE OR REPLACE FUNCTION reset_user_warnings(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Eliminar el contador del usuario (esto automáticamente lo desbloquea)
  DELETE FROM user_warning_counters
  WHERE user_id = p_user_id;
  
  -- Si no había registro, retornar true igualmente
  RETURN true;
END;
$$;

COMMENT ON FUNCTION reset_user_warnings IS 'Resetea el contador de warnings de un usuario, desbloqueándolo';

