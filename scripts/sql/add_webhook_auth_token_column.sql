-- ============================================
-- AÑADIR COLUMNA webhook_auth_token A log_server_config
-- Base de datos: System_UI (zbylezfyagwrxoecioup.supabase.co)
-- ============================================
-- Este script añade la columna para el token de autenticación del webhook
-- si la tabla ya existe y no tiene esta columna

-- Añadir columna si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'log_server_config' 
    AND column_name = 'webhook_auth_token'
  ) THEN
    ALTER TABLE log_server_config 
    ADD COLUMN webhook_auth_token TEXT;
    
    -- Actualizar registro existente con el token por defecto
    UPDATE log_server_config 
    SET webhook_auth_token = '4@Lt''\o93BSkgA59MH[TSC"gERa+)jlgf|BWIR-7fAmM9o59}3.|W2k-JiRu(oeb'
    WHERE webhook_auth_token IS NULL;
    
    RAISE NOTICE 'Columna webhook_auth_token añadida exitosamente';
  ELSE
    RAISE NOTICE 'La columna webhook_auth_token ya existe';
  END IF;
END $$;

-- Añadir comentario
COMMENT ON COLUMN log_server_config.webhook_auth_token IS 'Token de autenticación Bearer para el webhook (opcional)';

